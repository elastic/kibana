/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPanel,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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
  BarSeriesSpec,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import euiVars from '@elastic/eui/dist/eui_theme_light.json';
import {
  TotalFeatureImportance,
  isClassificationTotalFeatureImportance,
  isRegressionTotalFeatureImportance,
  RegressionTotalFeatureImportance,
  ClassificationTotalFeatureImportance,
} from '../../../../../../../common/types/inference';
import { useMlKibana } from '../../../../../contexts/kibana';
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
};

export interface FeatureImportanceSummaryPanelProps {
  totalFeatureImportance: TotalFeatureImportance[];
}

const tooltipContent = i18n.translate(
  'xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTooltipContent',
  {
    defaultMessage:
      'Shows to what degree a given feature of a data point contributes to the prediction. The magnitude of feature importance shows how significantly the feature affects the prediction both locally (for a given data point) or generally (for the whole data set).',
  }
);

export const FeatureImportanceSummaryPanel: FC<FeatureImportanceSummaryPanelProps> = ({
  totalFeatureImportance,
}) => {
  const {
    services: { docLinks },
  } = useMlKibana();

  const [plotData, barSeriesSpec, showLegend, chartHeight] = useMemo(() => {
    let sortedData: Array<{
      featureName: string;
      meanImportance: number;
      className?: string;
    }> = [];
    let _barSeriesSpec: Partial<BarSeriesSpec> = {
      xAccessor: 'featureName',
      yAccessors: ['meanImportance'],
    };
    let classificationType:
      | 'binary_classification'
      | 'multiclass_classification'
      | 'regression'
      | '' = '';
    if (totalFeatureImportance.length < 1) {
      return [sortedData, _barSeriesSpec];
    }

    if (isClassificationTotalFeatureImportance(totalFeatureImportance[0])) {
      // if binary classification
      if (totalFeatureImportance[0].classes.length === 2) {
        classificationType = 'binary_classification';
        sortedData = (totalFeatureImportance as ClassificationTotalFeatureImportance[]).map((d) => {
          return {
            featureName: d.feature_name,
            // in case of binary classification, both classes will have the same mean importance
            meanImportance: d.classes[0].importance.mean_magnitude,
          };
        });
      }

      // if multiclass classification
      // stack them in order of increasing importance
      // so for each feature, biggest importance on the left to smallest importance on the right
      if (totalFeatureImportance[0].classes.length > 2) {
        classificationType = 'multiclass_classification';

        (totalFeatureImportance as ClassificationTotalFeatureImportance[]).forEach((feature) => {
          feature.classes
            .sort((a, b) => a.importance.mean_magnitude - b.importance.mean_magnitude)
            .forEach((featureClass) => {
              sortedData.push({
                featureName: feature.feature_name,
                meanImportance: featureClass.importance.mean_magnitude,
                className: featureClass.class_name,
              });
            });
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

      sortedData = (totalFeatureImportance as RegressionTotalFeatureImportance[]).map(
        (d: RegressionTotalFeatureImportance) => ({
          featureName: d.feature_name,
          meanImportance: d.importance.mean_magnitude,
        })
      );
    }

    // sort from largest importance at top to smallest importance at bottom
    sortedData = sortedData.sort((a, b) => b.meanImportance - a.meanImportance);

    // only show legend if it's a multiclass
    const _showLegend = classificationType === 'multiclass_classification';
    const _chartHeight =
      totalFeatureImportance.length * (totalFeatureImportance.length < 5 ? 40 : 20) + 50;
    return [sortedData, _barSeriesSpec, _showLegend, _chartHeight];
  }, [totalFeatureImportance]);

  const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
  const tickFormatter = useCallback((d) => Number(d.toPrecision(3)).toString(), []);

  return (
    <EuiPanel>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <span>
              <FormattedMessage
                id="xpack.ml.dataframe.analytics.exploration.featureImportanceSummaryTitle"
                defaultMessage="Feature importance summary"
              />
            </span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIconTip content={tooltipContent} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSpacer />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            target="_blank"
            iconType="help"
            iconSide="left"
            color="primary"
            href={`${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-feature-importance.html`}
          >
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.exploration.featureImportanceDocsLink"
              defaultMessage="Feature importance docs"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Chart
        className="story-chart"
        size={{
          width: '100%',
          height: chartHeight,
        }}
      >
        <Settings rotation={90} theme={theme} showLegend={showLegend} />

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
          id="bars"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          data={plotData}
          {...barSeriesSpec}
        />
      </Chart>
    </EuiPanel>
  );
};
