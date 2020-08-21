/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FeatureImportance, TopClasses } from '../../../../../common/types/feature_importance';
import { findMaxMin, useDecisionPathData } from './use_classification_path_data';
import { DecisionPathChart } from './decision_path_chart';

interface RegressionDecisionPathProps {
  predictionFieldName?: string;
  baseline?: number;
  predictedValue?: number | undefined;
  featureImportance: FeatureImportance[];
  topClasses?: TopClasses;
}

export const RegressionDecisionPath: FC<RegressionDecisionPathProps> = ({
  baseline,
  featureImportance,
  predictedValue,
  predictionFieldName,
}) => {
  const { decisionPathData } = useDecisionPathData({
    baseline,
    featureImportance,
    predictedValue,
  });
  const domain = useMemo(() => {
    let maxDomain;
    let minDomain;
    // if decisionPathData has calculated cumulative path
    if (
      Array.isArray(decisionPathData) &&
      decisionPathData.length > 0 &&
      decisionPathData[0].length === 3
    ) {
      const { max, min } = findMaxMin(decisionPathData, (d: [string, number, number]) => d[2]);
      maxDomain = max;
      minDomain = min;
      const buffer = Math.abs(maxDomain - minDomain) * 0.1;
      maxDomain =
        (typeof baseline === 'number' ? Math.max(maxDomain, baseline) : maxDomain) + buffer;
      minDomain =
        (typeof baseline === 'number' ? Math.min(minDomain, baseline) : minDomain) - buffer;
    }
    return { maxDomain, minDomain };
  }, [decisionPathData, baseline]);

  if (!decisionPathData) return <div />;

  return (
    <>
      {baseline === undefined && (
        <EuiCallOut
          size={'s'}
          heading={'p'}
          title={
            <FormattedMessage
              id="xpack.ml.dataframe.analytics.explorationResults.missingBaselineCallout"
              defaultMessage="Unable to calculate baseline value, which might result in a shifted decision path."
            />
          }
          color="warning"
          iconType="alert"
        />
      )}
      <DecisionPathChart
        decisionPathData={decisionPathData}
        predictionFieldName={predictionFieldName}
        minDomain={domain.minDomain}
        maxDomain={domain.maxDomain}
        baseline={baseline}
      />
    </>
  );
};
