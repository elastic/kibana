/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  Chart,
  Settings,
  Axis,
  ScaleType,
  Position,
  BarSeries,
  RecursivePartial,
  AxisStyle,
  PartialTheme,
  BarSeriesProps,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { euiLightVars as euiVars } from '@kbn/ui-theme';
import {
  TotalFeatureImportance,
  isClassificationTotalFeatureImportance,
  isRegressionTotalFeatureImportance,
  RegressionTotalFeatureImportance,
  ClassificationTotalFeatureImportance,
  FeatureImportanceClassName,
} from '../../../../../../../common/types/feature_importance';

import { useMlKibana } from '../../../../../contexts/kibana';

import { ExpandableSection } from '../expandable_section';
import { DataFrameAnalyticsConfig } from '../../../../../../../common/types/data_frame_analytics';
import { getAnalysisType } from '../../../../common';
import { isClassificationAnalysis, isRegressionAnalysis } from '../../../../common/analytics';

const { euiColorMediumShade } = euiVars;
const axisColor = euiColorMediumShade;

const axes: RecursivePartial<AxisStyle> = {
  axisLine: {
    stroke: axisColor,
  },
  tickLabel: {
    fontSize: 12,
    fill: axisColor,
  },
  tickLine: {
    stroke: axisColor,
  },
  gridLine: {
    horizontal: {
      dash: [1, 2],
    },
    vertical: {
      strokeWidth: 0,
    },
  },
};
const theme: PartialTheme = {
  axes,
  legend: {
    /**
     * Added buffer between label and value.
     * Smaller values render a more compact legend
     */
    spacingBuffer: 100,
  },
};

export interface FeatureImportanceSummaryPanelProps {
  totalFeatureImportance: TotalFeatureImportance[];
  jobConfig: DataFrameAnalyticsConfig;
}

const tooltipContent = i18n.translate(
  'xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTooltipContent',
  {
    defaultMessage:
      'Total feature importance values indicate how significantly a field affects the predictions across all the training data.',
  }
);

const calculateTotalMeanImportance = (featureClass: ClassificationTotalFeatureImportance) => {
  return featureClass.classes.reduce(
    (runningSum, fc) => runningSum + fc.importance.mean_magnitude,
    0
  );
};

export const FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps> = ({
  totalFeatureImportance,
  jobConfig,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();

  interface Datum {
    featureName: string;
    meanImportance: number;
    className?: FeatureImportanceClassName;
  }
  type PlotData = Datum[];
  type SeriesProps = Omit<BarSeriesProps, 'id' | 'xScaleType' | 'yScaleType' | 'data'>;
  const [plotData, barSeriesSpec, showLegend, chartHeight] = useMemo<
    [plotData: PlotData, barSeriesSpec: SeriesProps, showLegend?: boolean, chartHeight?: number]
  >(() => {
    let sortedData: PlotData = [];
    let _barSeriesSpec: SeriesProps = {
      xAccessor: 'featureName',
      yAccessors: ['meanImportance'],
      name: i18n.translate(
        'xpack.ml.dataframe.analytics.exploration.featureImportanceYSeriesName',
        {
          defaultMessage: 'magnitude',
        }
      ) as string,
    };
    let classificationType:
      | 'binary_classification'
      | 'multiclass_classification'
      | 'regression'
      | '' = '';
    if (totalFeatureImportance.length < 1) {
      return [sortedData, _barSeriesSpec, undefined, undefined];
    }

    if (isClassificationTotalFeatureImportance(totalFeatureImportance[0])) {
      // if binary classification
      if (totalFeatureImportance[0].classes.length === 2) {
        classificationType = 'binary_classification';
        sortedData = (totalFeatureImportance as ClassificationTotalFeatureImportance[])
          .map((d) => {
            return {
              featureName: d.feature_name,
              // in case of binary classification, both classes will have the same mean importance
              meanImportance: d.classes[0].importance.mean_magnitude,
            };
          })
          .sort((a, b) => b.meanImportance - a.meanImportance);
      }

      // if multiclass classification
      // stack them in order of increasing importance
      // so for each feature, biggest importance on the left to smallest importance on the right
      if (totalFeatureImportance[0].classes.length > 2) {
        classificationType = 'multiclass_classification';

        (totalFeatureImportance as ClassificationTotalFeatureImportance[])
          .sort(
            (prevFeature, currentFeature) =>
              calculateTotalMeanImportance(currentFeature) -
              calculateTotalMeanImportance(prevFeature)
          )
          .forEach((feature) => {
            const sortedFeatureClass = feature.classes.sort(
              (a, b) => b.importance.mean_magnitude - a.importance.mean_magnitude
            );
            sortedData.push(
              ...sortedFeatureClass.map((featureClass) => ({
                featureName: feature.feature_name,
                meanImportance: featureClass.importance.mean_magnitude,
                className: featureClass.class_name,
              }))
            );
          });

        _barSeriesSpec = {
          xAccessor: 'featureName',
          yAccessors: ['meanImportance'],
          splitSeriesAccessors: ['className'],
          stackAccessors: ['featureName'],
        };
      }
    }
    // if regression
    if (isRegressionTotalFeatureImportance(totalFeatureImportance[0])) {
      classificationType = 'regression';

      sortedData = (totalFeatureImportance as RegressionTotalFeatureImportance[])
        .map((d: RegressionTotalFeatureImportance) => ({
          featureName: d.feature_name,
          meanImportance: d.importance.mean_magnitude,
        }))
        .sort((a, b) => b.meanImportance - a.meanImportance);
    }

    // only show legend if it's a multiclass
    const _showLegend = classificationType === 'multiclass_classification';
    const _chartHeight =
      totalFeatureImportance.length * (totalFeatureImportance.length < 5 ? 40 : 20) + 50;
    return [sortedData, _barSeriesSpec, _showLegend, _chartHeight];
  }, [totalFeatureImportance]);

  const docLink = docLinks.links.ml.featureImportance;
  const tickFormatter = useCallback((d) => Number(d.toPrecision(3)).toString(), []);

  // do not expand by default if no feature importance data
  const noDataCallOut = useMemo(() => {
    // if no total feature importance data
    if (totalFeatureImportance.length === 0) {
      // check if it's because num_top_feature_importance_values is set to 0
      if (
        (jobConfig?.analysis && isRegressionAnalysis(jobConfig?.analysis)) ||
        isClassificationAnalysis(jobConfig?.analysis)
      ) {
        const analysisType = getAnalysisType(jobConfig.analysis);
        if (
          analysisType !== 'unknown' &&
          jobConfig.analysis[analysisType].num_top_feature_importance_values === 0
        ) {
          return (
            <EuiCallOut
              data-test-subj="mlTotalFeatureImportanceNotCalculatedCallout"
              size="s"
              title={
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.exploration.totalFeatureImportanceNotCalculatedCalloutMessage"
                  defaultMessage="Feature importance was not calculated because num_top_feature_importance values is set to 0."
                />
              }
            />
          );
        } else {
          // or is it because the data is uniform
          return (
            <EuiCallOut
              data-test-subj="mlNoTotalFeatureImportanceCallout"
              size="s"
              title={
                <FormattedMessage
                  id="xpack.ml.dataframe.analytics.exploration.noTotalFeatureImportanceCalloutMessage"
                  defaultMessage="Total feature importance data is not available; the data set is uniform and the features have no significant impact on the prediction."
                />
              }
            />
          );
        }
      }
    }
  }, [totalFeatureImportance, jobConfig]);
  return (
    <>
      <ExpandableSection
        urlStateKey={'feature_importance'}
        isExpanded={noDataCallOut === undefined}
        dataTestId="FeatureImportanceSummary"
        title={
          <FormattedMessage
            id="xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTitle"
            defaultMessage="Total feature importance"
          />
        }
        docsLink={
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={docLink}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.featureImportanceDocsLink"
              defaultMessage="Feature importance docs"
            />
          </EuiButtonEmpty>
        }
        headerItems={[
          {
            id: 'FeatureImportanceSummary',
            value: tooltipContent,
          },
        ]}
        content={
          noDataCallOut ? (
            noDataCallOut
          ) : (
            <div data-test-subj="mlTotalFeatureImportanceChart">
              <Chart
                size={{
                  width: '100%',
                  height: chartHeight,
                }}
              >
                <Settings
                  rotation={90}
                  // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
                  theme={theme}
                  showLegend={showLegend}
                />

                <Axis
                  id="x-axis"
                  title={i18n.translate(
                    'xpack.ml.dataframe.analytics.exploration.featureImportanceXAxisTitle',
                    {
                      defaultMessage: 'Feature importance average magnitude',
                    }
                  )}
                  position={Position.Bottom}
                  tickFormat={tickFormatter}
                />
                <Axis id="y-axis" title="" position={Position.Left} />
                <BarSeries
                  id="magnitude"
                  xScaleType={ScaleType.Ordinal}
                  yScaleType={ScaleType.Linear}
                  data={plotData}
                  {...barSeriesSpec}
                />
              </Chart>
            </div>
          )
        }
      />
      <EuiSpacer size="m" />
    </>
  );
};
