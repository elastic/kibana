/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiHealth, EuiSpacer, EuiSuperSelect, EuiTitle } from '@elastic/eui';
import { findMaxMin, useDecisionPathData } from './use_classification_path_data';
import { FeatureImportance, TopClasses } from '../../../../../common/types/feature_importance';
import { DecisionPathChart } from './decision_path_chart';
interface ClassificationDecisionPathProps {
  predictedValue: string | undefined;
  predictionFieldName?: string;
  featureImportance: FeatureImportance[];
  topClasses: TopClasses;
}

export const ClassificationDecisionPath: FC<ClassificationDecisionPathProps> = ({
  featureImportance,
  predictedValue,
  topClasses,
  predictionFieldName,
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
  const domain = useMemo(() => {
    let maxDomain;
    let minDomain;
    // if decisionPathData has calculated cumulative path
    if (Array.isArray(decisionPathData) && decisionPathData.length === 3) {
      const { max, min } = findMaxMin(decisionPathData, (d: [string, number, number]) => d[2]);
      const buffer = Math.abs(max - min) * 0.1;
      maxDomain = max + buffer;
      minDomain = min - buffer;
    }
    return { maxDomain, minDomain };
  }, [decisionPathData]);

  if (!decisionPathData) return <div />;

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
      <DecisionPathChart
        decisionPathData={decisionPathData}
        predictionFieldName={predictionFieldName}
        minDomain={domain.minDomain}
        maxDomain={domain.maxDomain}
      />
    </>
  );
};
