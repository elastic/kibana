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
} from '@elastic/charts';
import _ from 'lodash';
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

const theme: PartialTheme = {
  axes: {
    tickLabel: {
      fontSize: 30,
    },
  },
};

interface FeatureImportanceDecisionPathProps {
  baseline?: number;
  decisionPlotData: LineAnnotationDatum[];
  predictedValue?: number | undefined;
}

export const FeatureImportanceDecisionPath: FC<FeatureImportanceDecisionPathProps> = ({
  baseline,
  decisionPlotData,
}) => {
  if (!decisionPlotData) return <div />;

  const baselineData: LineAnnotationDatum[] = [{ dataValue: baseline, details: 'baseline' }];
  let maxDomain = _.maxBy(decisionPlotData, (d) => d[2])[2];
  let minDomain = _.minBy(decisionPlotData, (d) => d[2])[2];
  // adjust domain so plot have some space on both sides
  // and to account for baseline out of range
  const buffer = Math.abs(maxDomain - minDomain) * 0.1;
  maxDomain = Math.max(maxDomain, baseline) + buffer;
  minDomain = Math.min(minDomain, baseline) - buffer;

  // adjust the height so it's compact for items with more features
  const heightMultiplier = decisionPlotData.length > 3 ? 25 : 75;

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
          yAccessors={[2]} // if baseline exist then shows the decision path else show in order of descending importance
          data={decisionPlotData}
        />
      </Chart>
    </>
  );
};
