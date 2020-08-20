/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useState } from 'react';
import {
  Chart,
  Settings,
  LineSeries,
  Axis,
  ScaleType,
  Position,
  PartialTheme,
  AxisConfig,
  RecursivePartial,
} from '@elastic/charts';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiTitle } from '@elastic/eui';
import { findMaxMin, useDecisionPathData } from './use_classification_path_data';
import { FeatureImportance, TopClasses } from '../../../../../common/types/feature_importance';

const axes: RecursivePartial<AxisConfig> = {
  tickLabelStyle: {
    fontSize: 12,
  },
};
const theme: PartialTheme = {
  axes,
};
interface ClassificationDecisionPathProps {
  predictedValue: string | undefined;
  featureImportance: FeatureImportance[];
  topClasses: TopClasses;
}

export const ClassificationDecisionPath: FC<ClassificationDecisionPathProps> = ({
  featureImportance,
  predictedValue,
  topClasses,
}) => {
  const [currentClass, setCurrentClass] = useState<string>(topClasses[0].class_name);
  const { decisionPathData } = useDecisionPathData({
    featureImportance,
    predictedValue: currentClass,
  });
  const options = useMemo(
    () =>
      Array.isArray(topClasses) && typeof predictedValue === 'string'
        ? topClasses.map((c) => ({
            value: c.class_name,
            inputDisplay:
              c.class_name === predictedValue ? (
                <EuiHealth color="success" style={{ lineHeight: 'inherit' }}>
                  {c.class_name}
                </EuiHealth>
              ) : (
                c.class_name
              ),
          }))
        : undefined,
    [topClasses, predictedValue]
  );

  if (!decisionPathData) return <div />;
  let maxDomain;
  let minDomain;
  // if decisionPathData has calculated cumulative path
  if (Array.isArray(decisionPathData) && decisionPathData.length === 3) {
    const { max, min } = findMaxMin(decisionPathData, (d: [string, number, number]) => d[2]);
    const buffer = Math.abs(max - min) * 0.1;
    maxDomain = max + buffer;
    minDomain = min - buffer;
  }

  // adjust the height so it's compact for items with more features
  const heightMultiplier = Array.isArray(decisionPathData) && decisionPathData.length > 3 ? 35 : 75;
  return (
    <>
      <EuiSpacer size={'xs'} />
      <EuiTitle size={'xxxs'}>
        <span>
          {i18n.translate(
            'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathClassNameTitle',
            {
              defaultMessage: 'Class name',
            }
          )}
        </span>
      </EuiTitle>
      {options !== undefined && (
        <EuiSuperSelect
          compressed={true}
          options={options}
          valueOfSelected={currentClass}
          onChange={setCurrentClass}
        />
      )}
      <Chart size={{ height: decisionPathData.length * heightMultiplier }}>
        <Settings theme={theme} rotation={90} />
        <Axis
          id={'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathXAxis'}
          tickFormat={(d) => `${Number(d).toPrecision(3)}`}
          title={i18n.translate(
            'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathXAxisTitle',
            {
              defaultMessage: 'Prediction',
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
          id={'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathLine'}
          name={i18n.translate(
            'xpack.ml.dataframe.analytics.explorationResults.classificationDecisionPathLineTitle',
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
    </>
  );
};
