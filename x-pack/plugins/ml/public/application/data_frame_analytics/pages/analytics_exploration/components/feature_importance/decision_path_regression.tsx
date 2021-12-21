/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import d3 from 'd3';
import type {
  FeatureImportance,
  FeatureImportanceBaseline,
  TopClasses,
} from '../../../../../../../common/types/feature_importance';
import { useDecisionPathData, isDecisionPathData } from './use_classification_path_data';
import { DecisionPathChart } from './decision_path_chart';
import { MissingDecisionPathCallout } from './missing_decision_path_callout';

interface RegressionDecisionPathProps {
  predictionFieldName?: string;
  baseline?: FeatureImportanceBaseline;
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
    if (decisionPathData && isDecisionPathData(decisionPathData)) {
      const [min, max] = d3.extent(decisionPathData, (d: [string, number, number]) => d[2]);
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

  if (!decisionPathData) return <MissingDecisionPathCallout />;

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
