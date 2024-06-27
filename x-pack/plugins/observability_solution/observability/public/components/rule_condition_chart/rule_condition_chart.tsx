/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { Query, Filter } from '@kbn/es-query';
import { FillStyle, SeriesType } from '@kbn/lens-plugin/public';
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
import { COMPARATORS } from '@kbn/alerting-comparators';
import { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { TimeUnitChar } from '../../../common';
import { LEGACY_COMPARATORS } from '../../../common/utils/convert_legacy_outside_comparator';
import { EventsAsUnit } from '../../../common/constants';
import { Aggregators } from '../../../common/custom_threshold_rule/types';
import { useKibana } from '../../utils/kibana_react';
import { AggMap, PainlessTinyMathParser } from './painless_tinymath_parser';
import {
  lensFieldFormatter,
  getBufferThreshold,
  getLensOperationFromRuleMetric,
  isRate,
  LensFieldFormat,
} from './helpers';
interface ChartOptions {
  seriesType?: SeriesType;
  interval?: string;
}

interface GenericSearchSourceFields extends SerializedSearchSourceFields {
  query?: Query;
  filter?: Array<Pick<Filter, 'meta' | 'query'>>;
}

export type GenericAggType = Aggregators | 'custom';

export interface GenericMetric {
  aggType: GenericAggType;
  name: string;
  field?: string;
  filter?: string;
}

export interface RuleConditionChartExpressions {
  metrics: GenericMetric[];
  threshold: number[];
  comparator: COMPARATORS | LEGACY_COMPARATORS;
  warningThreshold?: number[];
  warningComparator?: COMPARATORS | LEGACY_COMPARATORS;
  timeSize?: number;
  timeUnit?: TimeUnitChar;
  equation?: string;
}
export interface RuleConditionChartProps {
  metricExpression: RuleConditionChartExpressions;
  searchConfiguration: GenericSearchSourceFields;
  dataView?: DataView;
  groupBy?: string | string[];
  error?: IErrorObject;
  timeRange: TimeRange;
  annotations?: EventAnnotationConfig[];
  chartOptions?: ChartOptions;
  additionalFilters?: Filter[];
}

const defaultQuery: Query = {
  language: 'kuery',
  query: '',
};

export function RuleConditionChart({
  metricExpression,
  searchConfiguration,
  dataView,
  groupBy,
  error,
  annotations,
  timeRange,
  chartOptions: { seriesType, interval } = {},
  additionalFilters = [],
}: RuleConditionChartProps) {
  const {
    services: { lens },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const {
    metrics,
    timeSize,
    timeUnit,
    threshold,
    comparator,
    equation,
    warningComparator,
    warningThreshold,
  } = metricExpression;
  const [attributes, setAttributes] = useState<LensAttributes>();
  const [aggMap, setAggMap] = useState<AggMap>();
  const [formula, setFormula] = useState<string>('');
  const [thresholdReferenceLine, setThresholdReferenceLine] = useState<XYReferenceLinesLayer[]>();
  const [warningThresholdReferenceLine, setWarningThresholdReferenceLine] =
    useState<XYReferenceLinesLayer[]>();
  const [alertAnnotation, setAlertAnnotation] = useState<XYByValueAnnotationsLayer>();
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const filters = [...(searchConfiguration.filter || []), ...additionalFilters];
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
          'xpack.observability.ruleCondition.chart.error_equation.title',
          {
            defaultMessage: 'An error occurred while rendering the chart',
          }
        );
        paragraphElements[1].innerText = i18n.translate(
          'xpack.observability.ruleCondition.chart.error_equation.description',
          {
            defaultMessage: 'Check the rule equation.',
          }
        );
      }
    });
  }, [chartLoading, attributes]);

  // Build the warning threshold reference line
  useEffect(() => {
    if (!warningThreshold) {
      if (warningThresholdReferenceLine?.length) {
        setWarningThresholdReferenceLine([]);
      }
      return;
    }
    const refLayers = [];
    if (
      warningComparator === COMPARATORS.NOT_BETWEEN ||
      (warningComparator === COMPARATORS.BETWEEN && warningThreshold.length === 2)
    ) {
      const refLineStart = new XYReferenceLinesLayer({
        data: [
          {
            value: (warningThreshold[0] || 0).toString(),
            color: euiTheme.colors.warning,
            fill: warningComparator === COMPARATORS.NOT_BETWEEN ? 'below' : 'none',
          },
        ],
      });
      const refLineEnd = new XYReferenceLinesLayer({
        data: [
          {
            value: (warningThreshold[1] || 0).toString(),
            color: euiTheme.colors.warning,
            fill: warningComparator === COMPARATORS.NOT_BETWEEN ? 'above' : 'none',
          },
        ],
      });

      refLayers.push(refLineStart, refLineEnd);
    } else {
      let fill: FillStyle = 'above';
      if (
        warningComparator === COMPARATORS.LESS_THAN ||
        warningComparator === COMPARATORS.LESS_THAN_OR_EQUALS
      ) {
        fill = 'below';
      }
      const warningThresholdRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: (warningThreshold[0] || 0).toString(),
            color: euiTheme.colors.warning,
            fill,
          },
        ],
      });
      // A transparent line to add extra buffer at the top of threshold
      const bufferRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: getBufferThreshold(warningThreshold[0]),
            color: 'transparent',
            fill,
          },
        ],
      });
      refLayers.push(warningThresholdRefLine, bufferRefLine);
    }
    setWarningThresholdReferenceLine(refLayers);
  }, [
    warningThreshold,
    warningComparator,
    euiTheme.colors.warning,
    metrics,
    warningThresholdReferenceLine?.length,
  ]);

  // Build the threshold reference line
  useEffect(() => {
    if (!threshold) return;
    const refLayers = [];

    if (
      comparator === COMPARATORS.NOT_BETWEEN ||
      (comparator === COMPARATORS.BETWEEN && threshold.length === 2)
    ) {
      const refLineStart = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === COMPARATORS.NOT_BETWEEN ? 'below' : 'none',
          },
        ],
      });
      const refLineEnd = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[1] || 0).toString(),
            color: euiTheme.colors.danger,
            fill: comparator === COMPARATORS.NOT_BETWEEN ? 'above' : 'none',
          },
        ],
      });

      refLayers.push(refLineStart, refLineEnd);
    } else {
      let fill: FillStyle = 'above';
      if (comparator === COMPARATORS.LESS_THAN || comparator === COMPARATORS.LESS_THAN_OR_EQUALS) {
        fill = 'below';
      }
      const thresholdRefLine = new XYReferenceLinesLayer({
        data: [
          {
            value: (threshold[0] || 0).toString(),
            color: euiTheme.colors.danger,
            fill,
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
      const operationField = getLensOperationFromRuleMetric(metric);
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
    const formatId = lensFieldFormatter(metrics);
    const baseLayer = {
      type: 'formula',
      value: formula,
      label: formula,
      groupBy,
      format: {
        id: formatId,
        params: {
          decimals: formatId === LensFieldFormat.PERCENT ? 0 : 2,
          suffix: isRate(metrics) && formatId === LensFieldFormat.NUMBER ? EventsAsUnit : undefined,
        },
      },
    };
    const xYDataLayerOptions: XYLayerOptions = {
      buckets: {
        type: 'date_histogram',
        params: {
          interval: interval || `${timeSize}${timeUnit}`,
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
        // We always scale the chart with seconds with RATE Agg.
        timeScale: isRate(metrics) ? 's' : undefined,
      })),
      options: xYDataLayerOptions,
    });

    const layers: Array<XYDataLayer | XYReferenceLinesLayer | XYByValueAnnotationsLayer> = [
      xyDataLayer,
    ];
    if (warningThresholdReferenceLine) {
      layers.push(...warningThresholdReferenceLine);
    }
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
    searchConfiguration,
    formula,
    formulaAsync.value,
    groupBy,
    interval,
    metrics,
    threshold,
    thresholdReferenceLine,
    alertAnnotation,
    timeSize,
    timeUnit,
    seriesType,
    warningThresholdReferenceLine,
  ]);

  if (
    !dataView ||
    !attributes ||
    error?.equation ||
    Object.keys(error?.metrics || error?.metric || {}).length !== 0 ||
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
              id="xpack.observability.customThreshold.rule.charts.noData.title"
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
        id="ruleConditionChart"
        style={{ height: 180 }}
        timeRange={timeRange}
        attributes={attributes}
        disableTriggers={true}
        query={(searchConfiguration.query as Query) || defaultQuery}
        filters={filters}
      />
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
