/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import {
  Chart,
  Datum,
  Settings,
  LineAnnotation,
  AnnotationDomainTypes,
  LineSeries,
  Axis,
  ScaleType,
  Position,
  LineAnnotationDatum,
} from '@elastic/charts';
import _ from 'lodash';
import { EuiIcon } from '@elastic/eui';

const style = {
  line: {
    strokeWidth: 1,
    stroke: '#ff0000',
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

interface FeatureImportance {
  feature_name: string;
  importance: number;
}
interface FeatureImportanceDecisionPathProps {
  baseline?: number;
  featureImportance: FeatureImportance[];
}

const FEATURE_NAME = 'feature_name';
const FEATURE_IMPORTANCE = 'importance';

export const FeatureImportanceDecisionPath: FC<FeatureImportanceDecisionPathProps> = ({
  baseline,
  featureImportance,
}) => {
  const baselineData: LineAnnotationDatum[] = [{ dataValue: baseline, details: 'baseline' }];

  let mappedFeatureImportance: Datum[] = featureImportance;

  if (baseline) {
    // also plot the baseline in the decision path visualization
    mappedFeatureImportance.push({ [FEATURE_NAME]: 'baseline', [FEATURE_IMPORTANCE]: baseline });

    // get the absolute difference of the importance value to the baseline for sorting
    mappedFeatureImportance = mappedFeatureImportance.map((d) => ({
      ...d,
      difference: Math.abs(d[FEATURE_IMPORTANCE] - baseline),
    }));

    // sort so importance so it goes from bottom (baseline) to top
    mappedFeatureImportance = mappedFeatureImportance
      .sort((a, b) => b.difference - a.difference)
      .map((d) => [d[FEATURE_NAME], d[FEATURE_IMPORTANCE]]);

    // start at the baseline and end at predicted value
    let cumulativeSum = 0;
    for (let i = mappedFeatureImportance.length - 1; i >= 0; i--) {
      cumulativeSum += mappedFeatureImportance[i][1];
      mappedFeatureImportance[i][2] = cumulativeSum;
    }
  } else {
    // sort so most positive importance on top -> most negative importance at bottom
    mappedFeatureImportance = mappedFeatureImportance
      .sort((a, b) => b[FEATURE_IMPORTANCE] - a[FEATURE_IMPORTANCE])
      .map((d) => [d[FEATURE_NAME], d[FEATURE_IMPORTANCE]]);
  }

  const maxDomain = _.maxBy(mappedFeatureImportance, (d) => d[1]);
  const minDomain = _.minBy(mappedFeatureImportance, (d) => d[1]);
  // adjust the height so it's compact for items with more features
  const heightMultiplier = mappedFeatureImportance.length > 3 ? 20 : 75;
  return (
    <>
      <Chart
        className="story-chart"
        size={{ height: mappedFeatureImportance.length * heightMultiplier }}
      >
        <Settings rotation={90} />
        {baseline && (
          <LineAnnotation
            id="dfa_baseline"
            domainType={AnnotationDomainTypes.YDomain}
            dataValues={baselineData}
            style={style}
            marker={<EuiIcon type={'annotation'} />}
          />
        )}

        <Axis
          tickFormat={(d) => `${Number(d).toFixed(3)}`}
          title={'Prediction'}
          showGridLines={true}
          id="bottom"
          position={Position.Bottom}
          showOverlappingTicks
          domain={
            minDomain && maxDomain
              ? {
                  min: minDomain.importance,
                  max: maxDomain.importance,
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
          yAccessors={baseline ? [2] : [1]} // if baseline exist then shows the decision path else show in order of descending importance
          data={mappedFeatureImportance}
        />
      </Chart>
    </>
  );
};
