/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// From https://github.com/open-telemetry/opentelemetry-js/blob/97bc6321c0fe4da7414afb83038279b735a5ba65/experimental/packages/opentelemetry-exporter-prometheus/src/PrometheusSerializer.ts
// Can be removed once https://github.com/open-telemetry/opentelemetry-js/issues/3033 is merged/released

/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Logger } from '@kbn/core/server';
import {
  ResourceMetrics,
  InstrumentType,
  DataPointType,
  ScopeMetrics,
  MetricData,
  DataPoint,
  Histogram,
} from '@opentelemetry/sdk-metrics-base';
import type { MetricAttributes } from '@opentelemetry/api-metrics';

// From https://github.com/open-telemetry/opentelemetry-js/blob/28c9e8829488a7fa131803447b0511195ae1fdf0/packages/opentelemetry-core/src/common/time.ts#L148
export function hrTimeToMilliseconds(time: [number, number]): number {
  return Math.round(time[0] * 1e3 + time[1] / 1e6);
}

type PrometheusDataTypeLiteral = 'counter' | 'gauge' | 'histogram' | 'summary' | 'untyped';

function escapeString(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function escapeAttributeValue(str: string) {
  if (typeof str !== 'string') {
    str = String(str);
  }
  return escapeString(str).replace(/"/g, '\\"');
}

const invalidCharacterRegex = /[^a-z0-9_]/gi;
/**
 * Ensures metric names are valid Prometheus metric names by removing
 * characters allowed by OpenTelemetry but disallowed by Prometheus.
 *
 * https://prometheus.io/docs/concepts/data_model/#metric-names-and-attributes
 *
 * 1. Names must match `[a-zA-Z_:][a-zA-Z0-9_:]*`
 *
 * 2. Colons are reserved for user defined recording rules.
 * They should not be used by exporters or direct instrumentation.
 *
 * OpenTelemetry metric names are already validated in the Meter when they are created,
 * and they match the format `[a-zA-Z][a-zA-Z0-9_.\-]*` which is very close to a valid
 * prometheus metric name, so we only need to strip characters valid in OpenTelemetry
 * but not valid in prometheus and replace them with '_'.
 *
 * @param name name to be sanitized
 */
function sanitizePrometheusMetricName(name: string): string {
  return name.replace(invalidCharacterRegex, '_'); // replace all invalid characters with '_'
}

/**
 * @private
 *
 * Helper method which assists in enforcing the naming conventions for metric
 * names in Prometheus
 * @param name the name of the metric
 * @param type the kind of metric
 * @returns string
 */
function enforcePrometheusNamingConvention(name: string, type: InstrumentType): string {
  // Prometheus requires that metrics of the Counter kind have "_total" suffix
  if (!name.endsWith('_total') && type === InstrumentType.COUNTER) {
    name = name + '_total';
  }

  return name;
}

function valueString(value: number) {
  if (Number.isNaN(value)) {
    return 'Nan';
  } else if (!Number.isFinite(value)) {
    if (value < 0) {
      return '-Inf';
    } else {
      return '+Inf';
    }
  } else {
    return `${value}`;
  }
}

function toPrometheusType(
  instrumentType: InstrumentType,
  dataPointType: DataPointType
): PrometheusDataTypeLiteral {
  switch (dataPointType) {
    case DataPointType.SINGULAR:
      if (
        instrumentType === InstrumentType.COUNTER ||
        instrumentType === InstrumentType.OBSERVABLE_COUNTER
      ) {
        return 'counter';
      }
      /**
       * - HISTOGRAM
       * - UP_DOWN_COUNTER
       * - OBSERVABLE_GAUGE
       * - OBSERVABLE_UP_DOWN_COUNTER
       */
      return 'gauge';
    case DataPointType.HISTOGRAM:
      return 'histogram';
    default:
      return 'untyped';
  }
}

function stringify(
  metricName: string,
  attributes: MetricAttributes,
  value: number,
  timestamp?: number,
  additionalAttributes?: MetricAttributes
) {
  let hasAttribute = false;
  let attributesStr = '';

  for (const [key, val] of Object.entries(attributes)) {
    const sanitizedAttributeName = sanitizePrometheusMetricName(key);
    hasAttribute = true;
    attributesStr += `${
      attributesStr.length > 0 ? ',' : ''
    }${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
  }
  if (additionalAttributes) {
    for (const [key, val] of Object.entries(additionalAttributes)) {
      const sanitizedAttributeName = sanitizePrometheusMetricName(key);
      hasAttribute = true;
      attributesStr += `${
        attributesStr.length > 0 ? ',' : ''
      }${sanitizedAttributeName}="${escapeAttributeValue(val)}"`;
    }
  }

  if (hasAttribute) {
    metricName += `{${attributesStr}}`;
  }

  return `${metricName} ${valueString(value)}${
    timestamp !== undefined ? ' ' + String(timestamp) : ''
  }\n`;
}

export class PrometheusSerializer {
  private logger: Logger;
  private _prefix: string | undefined;
  private _appendTimestamp: boolean;

  constructor(logger: Logger, prefix?: string, appendTimestamp = true) {
    if (prefix) {
      this._prefix = prefix + '_';
    }
    this._appendTimestamp = appendTimestamp;
    this.logger = logger;
  }

  serialize(resourceMetrics: ResourceMetrics): string {
    let str = '';
    for (const scopeMetrics of resourceMetrics.scopeMetrics) {
      str += this.serializeScopeMetrics(scopeMetrics);
    }
    return str;
  }

  serializeScopeMetrics(scopeMetrics: ScopeMetrics) {
    let str = '';
    for (const metric of scopeMetrics.metrics) {
      str += this.serializeMetricData(metric) + '\n';
    }
    return str;
  }

  serializeMetricData(metricData: MetricData) {
    let name = sanitizePrometheusMetricName(escapeString(metricData.descriptor.name));
    if (this._prefix) {
      name = `${this._prefix}${name}`;
    }
    const dataPointType = metricData.dataPointType;

    name = enforcePrometheusNamingConvention(name, metricData.descriptor.type);

    const help = `# HELP ${name} ${escapeString(
      metricData.descriptor.description || 'description missing'
    )}`;
    const type = `# TYPE ${name} ${toPrometheusType(metricData.descriptor.type, dataPointType)}`;

    let results = '';
    switch (dataPointType) {
      case DataPointType.SINGULAR: {
        results = metricData.dataPoints
          .map((it) => this.serializeSingularDataPoint(name, metricData.descriptor.type, it))
          .join('');
        break;
      }
      case DataPointType.HISTOGRAM: {
        results = metricData.dataPoints
          .map((it) => this.serializeHistogramDataPoint(name, metricData.descriptor.type, it))
          .join('');
        break;
      }
      default: {
        this.logger.error(`Unrecognizable DataPointType: ${dataPointType} for metric "${name}"`);
      }
    }

    return `${help}\n${type}\n${results}`.trim();
  }

  serializeSingularDataPoint(
    name: string,
    type: InstrumentType,
    dataPoint: DataPoint<number>
  ): string {
    let results = '';

    name = enforcePrometheusNamingConvention(name, type);
    const { value, attributes } = dataPoint;
    const timestamp = hrTimeToMilliseconds(dataPoint.endTime);
    results += stringify(
      name,
      attributes,
      value,
      this._appendTimestamp ? timestamp : undefined,
      undefined
    );
    return results;
  }

  serializeHistogramDataPoint(
    name: string,
    type: InstrumentType,
    dataPoint: DataPoint<Histogram>
  ): string {
    let results = '';

    name = enforcePrometheusNamingConvention(name, type);
    const { value, attributes } = dataPoint;
    const timestamp = hrTimeToMilliseconds(dataPoint.endTime);
    /** Histogram["bucket"] is not typed with `number` */
    for (const key of ['count', 'sum'] as Array<'count' | 'sum'>) {
      results += stringify(
        name + '_' + key,
        attributes,
        value[key],
        this._appendTimestamp ? timestamp : undefined,
        undefined
      );
    }

    let cumulativeSum = 0;
    const countEntries = value.buckets.counts.entries();
    let infiniteBoundaryDefined = false;
    for (const [idx, val] of countEntries) {
      cumulativeSum += val;
      const upperBound = value.buckets.boundaries[idx];
      /** HistogramAggregator is producing different boundary output -
       * in one case not including infinity values, in other -
       * full, e.g. [0, 100] and [0, 100, Infinity]
       * we should consider that in export, if Infinity is defined, use it
       * as boundary
       */
      if (upperBound === undefined && infiniteBoundaryDefined) {
        break;
      }
      if (upperBound === Infinity) {
        infiniteBoundaryDefined = true;
      }
      results += stringify(
        name + '_bucket',
        attributes,
        cumulativeSum,
        this._appendTimestamp ? timestamp : undefined,
        {
          le: upperBound === undefined || upperBound === Infinity ? '+Inf' : String(upperBound),
        }
      );
    }

    return results;
  }
}
