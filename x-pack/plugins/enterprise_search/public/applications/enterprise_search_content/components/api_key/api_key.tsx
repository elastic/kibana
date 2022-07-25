/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiFormLabel, EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

interface ApiKeyProps {
  actions?: React.ReactNode;
  apiKey: string;
  label?: string;
}

export const ApiKey: React.FC<ApiKeyProps> = ({ apiKey, label, actions }) => {
  const codeBlock = (
    <EuiCodeBlock fontSize="m" paddingSize="m" color="dark" isCopyable>
      {apiKey}
    </EuiCodeBlock>
  );
  return (
    <>
      {label && (
        <>
          <EuiFormLabel>{label}</EuiFormLabel>
          <EuiSpacer size="xs" />
        </>
      )}
      {actions ? (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>{codeBlock}</EuiFlexItem>
          <EuiFlexItem grow={false}>{actions}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        codeBlock
      )}
    </>
  );
};
