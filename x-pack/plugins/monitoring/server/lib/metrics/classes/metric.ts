/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { MissingRequiredError } from '../../error_missing_required';

interface RequiredMetricOptions {
  field: string;
  label: string;
  description: string;
  format: string;
  units: string;
  timestampField: string;
  [key: string]: string | boolean | number;
}

interface OptionalMetricOptions {
  app?: string;
  metricAgg?: string;
  mbField?: string;
  type?: string;
}

interface DefaultMetricOptions {
  derivative?: boolean;
}

export type MetricOptions = RequiredMetricOptions & OptionalMetricOptions & DefaultMetricOptions;

export class Metric {
  public field!: string;
  public docType?: string;
  public label!: string;
  public description!: string;
  public format!: string;
  public units!: string;
  public timestampField!: string;
  public app?: string;
  public metricAgg?: string;
  public mbField?: string;
  public derivative: boolean = false;
  public aggs?: object;
  public dateHistogramSubAggs?: object;
  public getDateHistogramSubAggs?: (options: any) => object;
  public calculation?: (
    bucket: any,
    key?: string,
    metric?: Metric,
    defaultSizeInSeconds?: number
  ) => number | null;
  public fieldSource?: string;
  public usageField?: string;
  public periodsField?: string;
  public quotaField?: string;

  constructor(opts: MetricOptions) {
    const props: Required<DefaultMetricOptions> = {
      derivative: false,
    };

    const requireds = {
      field: opts.field,
      label: opts.label,
      description: opts.description,
      format: opts.format,
      units: opts.units,
      timestampField: opts.timestampField,
    };

    this.checkRequiredParams(requireds);

    _.assign(this, _.defaults(opts, props));
  }

  checkRequiredParams<RequiredParams = RequiredMetricOptions>(requireds: RequiredParams) {
    const undefKey = _.findKey(requireds, _.isUndefined);
    if (undefKey) {
      throw new MissingRequiredError(undefKey);
    }
  }

  serialize() {
    // some fields exposed for debugging through HTML comment text
    const pickFields = [
      'app',
      'field',
      'metricAgg',
      'label',
      'title',
      'description',
      'units',
      'format',
    ];

    const metric = Object.create(this);
    return {
      ..._.pick(metric, pickFields),
      hasCalculation: Boolean(metric.calculation),
      isDerivative: metric.derivative,
    };
  }

  getFields() {
    return [this.field];
  }

  getDocType() {
    return this.docType || this.getInferredDocType();
  }

  getInferredDocType() {
    const fields = this.getFields();
    return fields && fields.length ? fields[0].split('.')[0] : null;
  }

  static calculateLatency(timeInMillis: number | null, totalEvents: number | null) {
    if (timeInMillis === null || totalEvents === null) {
      return null;
    } else if (timeInMillis < 0 || totalEvents < 0) {
      // Negative values indicate blips in the data (e.g., restarting a node) that we do not want to misrepresent
      return null;
    } else if (totalEvents === 0) {
      return 0;
    }

    return timeInMillis / totalEvents;
  }
}
