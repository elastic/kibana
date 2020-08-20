/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// adjust the height so it's compact for items with more features
import {
  AnnotationDomainTypes,
  Axis,
  AxisConfig,
  Chart,
  LineAnnotation,
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
import { DecisionPathPlotData } from './use_classification_path_data';

const baselineStyle = {
  line: {
    strokeWidth: 1,
    stroke: 'gray',
    opacity: 1,
  },
  details: {
    fontSize: 12,
    fontFamily: 'Arial',
    fontStyle: 'bold',
    fill: 'gray',
    padding: 0,
  },
};

const axes: RecursivePartial<AxisConfig> = {
  tickLabelStyle: {
    fontSize: 12,
  },
};
const theme: PartialTheme = {
  axes,
};

interface DecisionPathChartProps {
  decisionPathData: DecisionPathPlotData;
  predictionFieldName?: string;
  baseline?: number;
  minDomain: number | undefined;
  maxDomain: number | undefined;
}

export const DecisionPathChart = ({
  decisionPathData,
  predictionFieldName,
  minDomain,
  maxDomain,
  baseline,
}: DecisionPathChartProps) => {
  const heightMultiplier = Array.isArray(decisionPathData) && decisionPathData.length > 4 ? 30 : 75;
  const baselineData: LineAnnotationDatum[] = useMemo(
    () => [
      {
        dataValue: baseline ? parseFloat(baseline.toPrecision(3)) : undefined,
        details: i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.decisionPathBaselineText',
          {
            defaultMessage:
              'baseline (average of predictions for all data points in the training data set)',
          }
        ),
      },
    ],
    [baseline]
  );
  const tickFormatter = useCallback((d) => `${Number(d).toPrecision(3)}`, []);

  return (
    <Chart size={{ height: decisionPathData.length * heightMultiplier }}>
      <Settings theme={theme} rotation={90} />
      {baseline && (
        <LineAnnotation
          id="xpack.ml.dataframe.analytics.explorationResults.decisionPathBaseline"
          domainType={AnnotationDomainTypes.YDomain}
          dataValues={baselineData}
          style={baselineStyle}
          marker={<EuiIcon type={'annotation'} />}
        />
      )}

      <Axis
        id={'xpack.ml.dataframe.analytics.explorationResults.decisionPathXAxis'}
        tickFormat={tickFormatter}
        title={i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.decisionPathXAxisTitle',
          {
            defaultMessage: "Prediction for '{predictionFieldName}'",
            values: { predictionFieldName },
          }
        )}
        showGridLines={true}
        position={Position.Bottom}
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
        name={i18n.translate(
          'xpack.ml.dataframe.analytics.explorationResults.decisionPathLineTitle',
          {
            defaultMessage: 'Prediction',
          }
        )}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        xAccessor={0}
        yAccessors={[2]}
        data={decisionPathData}
      />
    </Chart>
  );
};
