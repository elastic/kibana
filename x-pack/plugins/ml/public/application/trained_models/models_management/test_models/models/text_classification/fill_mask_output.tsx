/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useMemo } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiProgress, EuiTitle } from '@elastic/eui';

import type { FillMaskInference } from './fill_mask_inference';

export const getFillMaskOutputComponent = (inferrer: FillMaskInference) => (
  <FillMaskOutput inferrer={inferrer} />
);

const FillMaskOutput: FC<{
  inferrer: FillMaskInference;
}> = ({ inferrer }) => {
  const result = useObservable(inferrer.inferenceResult$);
  const title = useMemo(() => inferrer.predictedValue(), []);

  if (!result) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>

      <EuiSpacer />

      {result.response.map(({ value, predictionProbability }) => (
        <>
          <EuiProgress value={predictionProbability * 100} max={100} size="m" />
          <EuiSpacer size="s" />
          <EuiFlexGroup>
            <>
              <EuiFlexItem>{value}</EuiFlexItem>
              <EuiFlexItem grow={false}>{predictionProbability}</EuiFlexItem>
            </>
          </EuiFlexGroup>
          <EuiSpacer />
        </>
      ))}
    </>
  );
};
