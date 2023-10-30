/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import { OperationType } from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import useAsync from 'react-use/lib/useAsync';
import {
  LensAttributes,
  LensAttributesBuilder,
  XYChart,
  XYDataLayer,
  XYLayerOptions,
} from '@kbn/lens-embeddable-utils';
import {
  Aggregators,
  CustomMetricAggTypes,
} from '../../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../../utils/kibana_react';
import { MetricExpression } from '../../types';
import { AggMap, PainlessTinyMathParser } from './painless_tinymath_parser';

interface PreviewChartPros {
  metricExpression: MetricExpression;
  dataView?: DataView;
  filterQuery?: string;
  groupBy?: string | string[];
}

function PreviewChart({ metricExpression, dataView, filterQuery, groupBy }: PreviewChartPros) {
  const {
    services: { lens },
  } = useKibana();

  const { metrics, timeSize, timeUnit, threshold, comparator, equation } = metricExpression;

  const [attributes, setAttributes] = useState<LensAttributes>();
  const [aggMap, setAggMap] = useState<AggMap>();
  const [formula, setFormula] = useState<string>('');

  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // Build the aggregation map from the metrics
  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      return;
    }
    const aggMapFromMetrics = metrics.reduce((acc, metric) => {
      const operation = getOperationTypeFromRuleAggType(metric.aggType);
      let sourceField = metric.field;

      if (metric.aggType === Aggregators.COUNT) {
        sourceField = '___records___';
      }
      let operationField = `${operation}(${sourceField})`;
      if (metric?.filter) {
        const aggFilter = JSON.stringify(metric.filter).replace(/"|\\/g, '');
        operationField = `${operation}(${sourceField},kql='${aggFilter}')`;
      }
      return {
        ...acc,
        [metric.name]: operationField,
      };
    }, {} as AggMap);

    setAggMap(aggMapFromMetrics);
  }, [metrics]);

  // Parse the equation
  useEffect(() => {
    try {
      if (!aggMap) return;
      const parser = new PainlessTinyMathParser({
        aggMap,
        equation: equation || Object.keys(aggMap || {}).join(' + '),
      });

      setFormula(parser.parse());
    } catch (e) {
      console.error('PainlessTinyMathParser', e);
      // Fail silently as Lens chart will show the error
      return;
    }
  }, [aggMap, equation]);

  const getOperationTypeFromRuleAggType = (aggType: CustomMetricAggTypes): OperationType => {
    if (aggType === Aggregators.AVERAGE) return 'average';
    if (aggType === Aggregators.CARDINALITY) return 'unique_count';
    return aggType;
  };

  useEffect(() => {
    if (!formulaAsync.value || !dataView || !formula) {
      return;
    }
    const baseLayer = {
      type: 'formula',
      value: formula,
      label: 'Custom Threshold',
      groupBy,
      format: {
        id: 'number',
        params: {
          decimals: 0,
        },
      },
      filter: {
        language: 'kuery',
        query: filterQuery || '',
      },
    };
    const xYDataLayerOptions: XYLayerOptions = {
      buckets: { type: 'date_histogram' },
      seriesType: 'bar',
    };

    if (groupBy && groupBy?.length) {
      xYDataLayerOptions.breakdown = {
        type: 'top_values',
        field: groupBy[0],
        params: {
          size: 3,
          secondaryFields: groupBy as string[],
          accuracyMode: false,
        },
      };
    }

    const xyDataLayer = new XYDataLayer({
      data: [baseLayer].map((layer) => ({
        type: layer.type,
        value: layer.value,
        label: layer.label,
        format: layer.format,
        filter: layer.filter,
      })),
      options: xYDataLayerOptions,
    });

    const attributesLens = new LensAttributesBuilder({
      visualization: new XYChart({
        layers: [xyDataLayer],
        formulaAPI: formulaAsync.value.formula,
        dataView,
      }),
    }).build();
    const lensBuilderAtt = { ...attributesLens, type: 'lens' };
    setAttributes(lensBuilderAtt);
  }, [
    comparator,
    dataView,
    equation,
    filterQuery,
    formula,
    formulaAsync.value,
    groupBy,
    metrics,
    threshold,
  ]);
  if (!dataView || !attributes) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xs"
          body={
            <FormattedMessage
              id="xpack.observability.customThreshold.rule..charts.noDataMessage"
              defaultMessage="No chart data available"
            />
          }
        />
      </div>
    );
  }
  return (
    <div>
      <lens.EmbeddableComponent
        id="customThresholdPreviewChart"
        style={{ height: 180 }}
        timeRange={{ from: `now-${timeSize}${timeUnit}`, to: 'now' }}
        attributes={attributes}
        withDefaultActions={true}
      />
    </div>
  );
}
// eslint-disable-next-line import/no-default-export
export default PreviewChart; // Correct export
