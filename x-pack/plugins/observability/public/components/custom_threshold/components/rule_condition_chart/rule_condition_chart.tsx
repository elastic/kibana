/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { FillStyle, OperationType, SeriesType } from '@kbn/lens-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import useAsync from 'react-use/lib/useAsync';
import {
  LensAttributes,
  LensAttributesBuilder,
  XYChart,
  XYDataLayer,
  XYLayerOptions,
  XYReferenceLinesLayer,
  XYByValueAnnotationsLayer,
} from '@kbn/lens-embeddable-utils';

import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { EventAnnotationConfig } from '@kbn/event-annotation-common';
import {
  Aggregators,
  Comparator,
  AggType,
} from '../../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../../utils/kibana_react';
import { MetricExpression } from '../../types';
import { AggMap, PainlessTinyMathParser } from './painless_tinymath_parser';

interface RuleConditionChartProps {
  metricExpression: MetricExpression;
  dataView?: DataView;
  filterQuery?: string;
  groupBy?: string | string[];
  error?: IErrorObject;
  timeRange: TimeRange;
  annotations?: EventAnnotationConfig[];
  seriesType?: SeriesType;
}

const getOperationTypeFromRuleAggType = (aggType: AggType): OperationType => {
  if (aggType === Aggregators.AVERAGE) return 'average';
  if (aggType === Aggregators.CARDINALITY) return 'unique_count';
  return aggType;
};

export const getBufferThreshold = (threshold?: number): string =>
  (Math.ceil((threshold || 0) * 1.1 * 100) / 100).toFixed(2).toString();

export function RuleConditionChart({
  metricExpression,
  dataView,
  filterQuery,
  groupBy,
  error,
  annotations,
  timeRange,
  seriesType,
}: RuleConditionChartProps) {
  const {
    services: { lens },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { metrics, timeSize, timeUnit, threshold, comparator, equation } = metricExpression;
  const [attributes, setAttributes] = useState<LensAttributes>();
  const [aggMap, setAggMap] = useState<AggMap>();
  const [formula, setFormula] = useState<string>('');
  const [thresholdReferenceLine, setThresholdReferenceLine] = useState<XYReferenceLinesLayer[]>();
  const [alertAnnotation, setAlertAnnotation] = useState<XYByValueAnnotationsLayer>();
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const formulaAsync = useAsync(() => {
    return lens.stateHelperApi();
  }, [lens]);

  // Handle Lens error
  useEffect(() => {
    // Lens does not expose or provide a way to check if there is an error in the chart, yet.
    // To work around this, we check if the element with class 'lnsEmbeddedError' is found in the DOM.
    setTimeout(function () {
      const errorDiv = document.querySelector('.lnsEmbeddedError');
      if (errorDiv) {
        const paragraphElements = errorDiv.querySelectorAll('p');
        if (!paragraphElements || paragraphElements.length < 2) return;
        paragraphElements[0].innerText = i18n.translate(
          'xpack.observability.customThreshold.rule..charts.error_equation.title',
          {
            defaultMessage: 'An error occurred while rendering the chart',
          }
        );
        paragraphElements[1].innerText = i18n.translate(
          'xpack.observability.customThreshold.rule..charts.error_equation.description',
          {
            defaultMessage: 'Check the rule equation.',
          }
        );
      }
    });
  }, [chartLoading, attributes]);

  // Build the threshold reference line
  useEffect(() => {
    if (!threshold) return;
    const refLayers = [];
    const isPercent = Boolean(metrics.length === 1 && metrics[0].field?.endsWith('.pct'));
    const format = {
      id: isPercent ? 'percent' : 'number',
      params: {
        decimals: isPercent ? 0 : 2,
      },
    };

    if (
      comparator === Comparator.OUTSIDE_RANGE ||
      (comparator === Comparator.BETWEEN && threshold.length === 2)
    ) {
      const refLineStart = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === Comparator.OUTSIDE_RANGE ? 'below' : 'none',
            format,
          },
        ],
      });
      const refLineEnd = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[1] || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === Comparator.OUTSIDE_RANGE ? 'above' : 'none',
            format,
          },
        ],
      });

      refLayers.push(refLineStart, refLineEnd);
    } else {
      let fill: FillStyle = 'above';
      if (comparator === Comparator.LT || comparator === Comparator.LT_OR_EQ) {
        fill = 'below';
      }
      const thresholdRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] || 0).toString(),
            color: euiTheme.colors.danger,
            fill,
            format,
          },
        ],
      });
      // A transparent line to add extra buffer at the top of threshold
      const bufferRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: getBufferThreshold(threshold[0]),
            color: 'transparent',
            fill,
            format,
          },
        ],
      });
      refLayers.push(thresholdRefLine, bufferRefLine);
    }
    setThresholdReferenceLine(refLayers);
  }, [threshold, comparator, euiTheme.colors.danger, metrics]);

  // Build alert annotation
  useEffect(() => {
    if (!annotations) return;

    const alertAnnotationLayer = new XYByValueAnnotationsLayer({
      annotations,
      ignoreGlobalFilters: true,
      dataView,
    });

    setAlertAnnotation(alertAnnotationLayer);
  }, [euiTheme.colors.danger, dataView, annotations]);

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
      // The error will appear on Lens chart.
      setAttributes(undefined);
      return;
    }
  }, [aggMap, equation]);

  useEffect(() => {
    if (!formulaAsync.value || !dataView || !formula) {
      return;
    }
    const isPercent = Boolean(metrics.length === 1 && metrics[0].field?.endsWith('.pct'));
    const baseLayer = {
      type: 'formula',
      value: formula,
      label: 'Custom Threshold',
      groupBy,
      format: {
        id: isPercent ? 'percent' : 'number',
        params: {
          decimals: isPercent ? 0 : 2,
        },
      },
    };
    const xYDataLayerOptions: XYLayerOptions = {
      buckets: {
        type: 'date_histogram',
        params: {
          interval: `${timeSize}${timeUnit}`,
        },
      },
      seriesType: seriesType ? seriesType : 'bar',
    };

    if (groupBy && groupBy?.length) {
      xYDataLayerOptions.breakdown = {
        type: 'top_values',
        field: groupBy[0],
        params: {
          size: 3,
          secondaryFields: (groupBy as string[]).slice(1),
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
      })),
      options: xYDataLayerOptions,
    });

    const layers: Array<XYDataLayer | XYReferenceLinesLayer | XYByValueAnnotationsLayer> = [
      xyDataLayer,
    ];
    if (thresholdReferenceLine) {
      layers.push(...thresholdReferenceLine);
    }
    if (alertAnnotation) {
      layers.push(alertAnnotation);
    }
    const attributesLens = new LensAttributesBuilder({
      visualization: new XYChart({
        visualOptions: {
          valueLabels: 'hide',
          axisTitlesVisibilitySettings: {
            x: true,
            yLeft: false,
            yRight: true,
          },
        },
        layers,
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
    thresholdReferenceLine,
    alertAnnotation,
    timeSize,
    timeUnit,
    seriesType,
  ]);

  if (
    !dataView ||
    !attributes ||
    error?.equation ||
    Object.keys(error?.metrics || {}).length !== 0 ||
    !timeSize ||
    !timeRange
  ) {
    return (
      <div style={{ maxHeight: 180, minHeight: 180 }}>
        <EuiEmptyPrompt
          iconType="visArea"
          titleSize="xxs"
          data-test-subj="thresholdRuleNoChartData"
          body={
            <FormattedMessage
              id="xpack.observability.customThreshold.rule..charts.noData.title"
              defaultMessage="No chart data available, check the rule {errorSourceField}"
              values={{
                errorSourceField:
                  Object.keys(error?.metrics || {}).length !== 0
                    ? 'aggregation fields'
                    : error?.equation
                    ? 'equation'
                    : 'conditions',
              }}
            />
          }
        />
      </div>
    );
  }
  return (
    <div>
      <lens.EmbeddableComponent
        onLoad={setChartLoading}
        id="customThresholdPreviewChart"
        style={{ height: 180 }}
        timeRange={timeRange}
        attributes={attributes}
        disableTriggers={true}
        query={{
          language: 'kuery',
          query: filterQuery || '',
        }}
      />
    </div>
  );
}
