/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiProgress, EuiTitle } from '@elastic/eui';

import type { FormattedTextClassificationResponse } from './common';

const MASK = '[MASK]';

export const getFillMaskOutputComponent =
  (inputText: string) => (output: FormattedTextClassificationResponse) =>
    <FillMaskOutput result={output} inputText={inputText} />;

const FillMaskOutput: FC<{
  result: FormattedTextClassificationResponse;
  inputText: string;
}> = ({ result, inputText }) => {
  const title = result[0]?.value ? inputText.replace(MASK, result[0].value) : inputText;
  return (
    <>
      <EuiTitle size="xs">
        <h4>{title}</h4>
      </EuiTitle>

      <EuiSpacer />

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
