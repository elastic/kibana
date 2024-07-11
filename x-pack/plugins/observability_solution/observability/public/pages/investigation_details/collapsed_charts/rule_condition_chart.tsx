/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { Query, Filter } from '@kbn/es-query';
import { SeriesType } from '@kbn/lens-plugin/public';
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
import { TimeUnitChar } from '../../../../common';
import { LEGACY_COMPARATORS } from '../../../../common/utils/convert_legacy_outside_comparator';
import { EventsAsUnit } from '../../../../common/constants';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../utils/kibana_react';
import { AggMap, PainlessTinyMathParser } from './painless_tinymath_parser';
import {
  lensFieldFormatter,
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
  metricExpression: RuleConditionChartExpressions[];
  searchConfiguration: GenericSearchSourceFields;
  dataView?: DataView;
  groupBy?: string | string[];
  error?: IErrorObject;
  timeRange: TimeRange;
  annotations?: EventAnnotationConfig[];
  chartOptions?: ChartOptions;
  additionalFilters?: Filter[];
  mode: 'original' | 'normalized';
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
  mode = 'normalized',
}: RuleConditionChartProps) {
  const {
    services: { lens },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const [attributes, setAttributes] = useState<LensAttributes>();
  const [aggMap, setAggMap] = useState<AggMap[]>();
  const [formula, setFormula] = useState<string[]>([]);
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
    const aggMapArray: AggMap[] = [];
    metricExpression.forEach((metricExp) => {
      if (!metricExp.metrics || metricExp.metrics.length === 0) {
        return;
      }
      const aggMapFromMetrics = metricExp.metrics.reduce((acc, metric) => {
        const operationField = getLensOperationFromRuleMetric(metric);
        return {
          ...acc,
          [metric.name]: operationField,
        };
      }, {} as AggMap);
      aggMapArray.push(aggMapFromMetrics);
    });

    setAggMap(aggMapArray);
  }, [metricExpression]);

  // Parse the equation
  useEffect(() => {
    try {
      const formulaArray: string[] = [];
      aggMap?.forEach((aggMapItem, index) => {
        if (!aggMapItem) return;
        const parser = new PainlessTinyMathParser({
          aggMap: aggMapItem,
          equation: metricExpression[index].equation || Object.keys(aggMapItem || {}).join(' + '),
        });
        formulaArray.push(parser.parse());
      });

      setFormula(formulaArray);
    } catch (e) {
      // The error will appear on Lens chart.
      setAttributes(undefined);
      return;
    }
  }, [aggMap, metricExpression]);

  useEffect(() => {
    if (!formulaAsync.value || !dataView || !formula) {
      return;
    }
    const formatId = lensFieldFormatter(metricExpression);
    const baseLayers: any[] = [];

    formula.forEach((formulaItem, index) => {
      let baseLayerFormula = formulaItem;

      if (mode === 'normalized') {
        baseLayerFormula = formulaItem.replaceAll('records', '').replaceAll('_', '');
        baseLayerFormula = `100 * (${baseLayerFormula} - overall_min(${baseLayerFormula})) / (overall_max(${baseLayerFormula}) - overall_min(${baseLayerFormula}))`;
      }

      const baseLayer = {
        type: 'formula',
        value: baseLayerFormula,
        label: mode === 'normalized' ? `Normalized ${formulaItem}` : formulaItem,
        groupBy,
        format: {
          id: formatId[index],
          params: {
            decimals: formatId[index] === LensFieldFormat.PERCENT ? 0 : 2,
            suffix:
              isRate(metricExpression[index].metrics) && formatId[index] === LensFieldFormat.NUMBER
                ? EventsAsUnit
                : undefined,
          },
        },
      };

      baseLayers.push(baseLayer);
    });

    const xYDataLayerOptions: XYLayerOptions = {
      buckets: {
        type: 'date_histogram',
        params: {
          interval: interval || `${metricExpression[0].timeSize}${metricExpression[0].timeUnit}`,
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
      data: baseLayers.map((layer) => ({
        type: layer.type,
        value: layer.value,
        label: layer.label,
        format: layer.format,
        // We always scale the chart with seconds with RATE Agg.
        // timeScale: isRate(metrics) ? 's' : undefined,
      })),
      options: xYDataLayerOptions,
    });

    const layers: Array<XYDataLayer | XYReferenceLinesLayer | XYByValueAnnotationsLayer> = [
      xyDataLayer,
    ];
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
            yRight: false,
          },
          lineInterpolation: 'CURVE_MONOTONE_X',
          legend: {
            isVisible: true,
            position: 'bottom',
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
    dataView,
    metricExpression,
    searchConfiguration,
    formula,
    formulaAsync.value,
    groupBy,
    interval,
    alertAnnotation,
    seriesType,
    mode,
  ]);

  if (
    !dataView ||
    !attributes ||
    error?.equation ||
    Object.keys(error?.metrics || error?.metric || {}).length !== 0 ||
    !metricExpression[0].timeSize ||
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
        style={{ height: 200 }}
        timeRange={timeRange}
        attributes={attributes}
        disableTriggers={true}
        query={(searchConfiguration.query as Query) || defaultQuery}
        filters={filters}
        overrides={{ axisLeft: { hide: true } }}
      />
    </div>
  );
}

// eslint-disable-next-line import/no-default-export
export default RuleConditionChart;
