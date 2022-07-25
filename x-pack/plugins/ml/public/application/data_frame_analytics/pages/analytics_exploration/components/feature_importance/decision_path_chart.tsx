/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AnnotationDomainType,
  Axis,
  AxisStyle,
  Chart,
  LineAnnotation,
  LineAnnotationStyle,
  LineAnnotationDatum,
  LineSeries,
  PartialTheme,
  Position,
  RecursivePartial,
  ScaleType,
  Settings,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { euiLightVars as euiVars } from '@kbn/ui-theme';
import type { DecisionPathPlotData } from './use_classification_path_data';
import { formatSingleValue } from '../../../../../formatters/format_value';
import {
  FeatureImportanceBaseline,
  isRegressionFeatureImportanceBaseline,
} from '../../../../../../../common/types/feature_importance';
const { euiColorFullShade, euiColorMediumShade } = euiVars;
const axisColor = euiColorMediumShade;

const baselineStyle: LineAnnotationStyle = {
  line: {
    strokeWidth: 1,
    stroke: euiColorFullShade,
    opacity: 0.75,
  },
  details: {
    fontFamily: 'Arial',
    fontSize: 10,
    fill: euiColorMediumShade,
    padding: 0,
  },
};

const axes: RecursivePartial<AxisStyle> = {
  axisLine: {
    stroke: axisColor,
  },
  tickLabel: {
    fontSize: 10,
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

interface DecisionPathChartProps {
  decisionPathData: DecisionPathPlotData;
  predictionFieldName?: string;
  baseline?: FeatureImportanceBaseline;
  minDomain: number | undefined;
  maxDomain: number | undefined;
}

const DECISION_PATH_MARGIN = 125;
const DECISION_PATH_ROW_HEIGHT = 10;
const AnnotationBaselineMarker = <EuiIcon type="dot" size="m" />;

export const DecisionPathChart = ({
  decisionPathData,
  predictionFieldName,
  minDomain,
  maxDomain,
  baseline,
}: DecisionPathChartProps) => {
  const regressionBaselineData: LineAnnotationDatum[] | undefined = useMemo(
    () =>
      baseline && isRegressionFeatureImportanceBaseline(baseline)
        ? [
            {
              dataValue: baseline.baseline,
              header: formatSingleValue(baseline.baseline, '').toString(),
              details: i18n.translate(
                'xpack.ml.dataframe.analytics.explorationResults.decisionPathBaselineText',
                {
                  defaultMessage:
                    'baseline (average of predictions for all data points in the training data set)',
                }
              ),
            },
          ]
        : undefined,
    [baseline]
  );
  const xAxisLabel = regressionBaselineData
    ? i18n.translate(
        'xpack.ml.dataframe.analytics.explorationResults.decisionPathLinePredictionTitle',
        {
          defaultMessage: 'Prediction',
        }
      )
    : i18n.translate(
        'xpack.ml.dataframe.analytics.explorationResults.decisionPathLinePredictionProbabilityTitle',
        {
          defaultMessage: 'Prediction probability',
        }
      );
  // if regression, guarantee up to num_precision significant digits without having it in scientific notation
  // if classification, hide the numeric values since we only want to show the path
  const tickFormatter = useCallback((d) => formatSingleValue(d, '').toString(), []);

  return (
    <div data-test-subj="mlDFADecisionPathChart">
      <Chart
        size={{ height: DECISION_PATH_MARGIN + decisionPathData.length * DECISION_PATH_ROW_HEIGHT }}
      >
        <Settings
          // TODO use the EUI charts theme see src/plugins/charts/public/services/theme/README.md
          theme={theme}
          rotation={90}
        />
        {regressionBaselineData && (
          <LineAnnotation
            id="xpack.ml.dataframe.analytics.explorationResults.decisionPathBaseline"
            domainType={AnnotationDomainType.YDomain}
            dataValues={regressionBaselineData}
            style={baselineStyle}
            marker={AnnotationBaselineMarker}
          />
        )}

        <Axis
          id={'xpack.ml.dataframe.analytics.explorationResults.decisionPathXAxis'}
          tickFormat={tickFormatter}
          title={i18n.translate(
            'xpack.ml.dataframe.analytics.explorationResults.decisionPathXAxisTitle',
            {
              defaultMessage: "{xAxisLabel} for '{predictionFieldName}'",
              values: { predictionFieldName, xAxisLabel },
            }
          )}
          showGridLines={false}
          position={Position.Top}
          showOverlappingTicks
          domain={
            minDomain && maxDomain
              ? {
                  min: minDomain,
                  max: maxDomain,
                }
              : undefined
          }
        />
        <Axis showGridLines={true} id="left" position={Position.Left} />
        <LineSeries
          id={'xpack.ml.dataframe.analytics.explorationResults.decisionPathLine'}
          name={xAxisLabel}
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[2]}
          data={decisionPathData}
        />
      </Chart>
    </div>
  );
};
