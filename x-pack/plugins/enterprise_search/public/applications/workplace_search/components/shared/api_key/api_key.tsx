/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCodeBlock, EuiFormLabel, EuiSpacer } from '@elastic/eui';

interface ApiKeyProps {
  apiKey: string;
  label?: string;
}

export const ApiKey: React.FC<ApiKeyProps> = ({ apiKey, label }) => (
  <>
    {label && (
      <>
        <EuiFormLabel>{label}</EuiFormLabel>
        <EuiSpacer size="xs" />
      </>
    )}
    <EuiCodeBlock language="bash" fontSize="m" paddingSize="m" color="dark" isCopyable>
      {apiKey}
    </EuiCodeBlock>
  </>
);
