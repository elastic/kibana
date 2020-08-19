/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  Chart,
  Settings,
  LineAnnotation,
  AnnotationDomainTypes,
  LineSeries,
  Axis,
  ScaleType,
  Position,
  LineAnnotationDatum,
  PartialTheme,
  AxisConfig,
  RecursivePartial,
} from '@elastic/charts';
import { EuiIcon } from '@elastic/eui';

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

export type DecisionPathPlotData = Array<[string, number, number]>;

interface FeatureImportanceDecisionPathProps {
  baseline?: number;
  decisionPlotData: DecisionPathPlotData | undefined;
  predictedValue?: number | undefined;
}

const findMaxMin = (data: DecisionPathPlotData, getter: Function): { max: number; min: number } => {
  let min = Infinity;
  let max = -Infinity;
  data.forEach((d) => {
    const value = getter(d);
    if (value > max) max = value;
    if (value < min) min = value;
  });
  return { max, min };
};

export const FeatureImportanceDecisionPath: FC<FeatureImportanceDecisionPathProps> = ({
  baseline,
  decisionPlotData,
}) => {
  if (!decisionPlotData) return <div />;
  const baselineData: LineAnnotationDatum[] = [{ dataValue: baseline, details: 'baseline' }];
  let maxDomain;
  let minDomain;
  // if decisionPlotData has calculated cumulative path
  if (Array.isArray(decisionPlotData) && decisionPlotData.length === 3) {
    const { max, min } = findMaxMin(decisionPlotData, (d: [string, number, number]) => d[2]);
    maxDomain = max;
    minDomain = min;
    const buffer = Math.abs(maxDomain - minDomain) * 0.1;
    maxDomain = (typeof baseline === 'number' ? Math.max(maxDomain, baseline) : maxDomain) + buffer;
    minDomain = (typeof baseline === 'number' ? Math.min(minDomain, baseline) : minDomain) - buffer;
  }

  // adjust the height so it's compact for items with more features
  const heightMultiplier = Array.isArray(decisionPlotData) && decisionPlotData.length > 3 ? 25 : 75;

  return (
    <>
      <Chart className="story-chart" size={{ height: decisionPlotData.length * heightMultiplier }}>
        <Settings theme={theme} rotation={90} />
        {baseline && (
          <LineAnnotation
            id="dfa_baseline"
            domainType={AnnotationDomainTypes.YDomain}
            dataValues={baselineData}
            style={baselineStyle}
            marker={<EuiIcon type={'annotation'} />}
          />
        )}

        <Axis
          tickFormat={(d) => `${Number(d).toPrecision(3)}`}
          title={'Prediction'}
          showGridLines={true}
          id="bottom"
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
          id="prediction"
          xScaleType={ScaleType.Ordinal}
          yScaleType={ScaleType.Linear}
          xAccessor={0}
          yAccessors={[2]}
          data={decisionPlotData}
        />
      </Chart>
    </>
  );
};
