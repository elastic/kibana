/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiProgress } from '@elastic/eui';

import type { FormattedTextClassificationResponse } from './common';

export const getTextClassificationOutputComponent = (
  output: FormattedTextClassificationResponse
) => <TextClassificationOutput result={output} />;

const TextClassificationOutput: FC<{ result: FormattedTextClassificationResponse }> = ({
  result,
}) => {
  return (
    <>
      {result.map(({ value, predictionProbability }) => (
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
