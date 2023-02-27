/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';

import { EuiLoadingChart, EuiSpacer } from '@elastic/eui';

export const LoadingIndicator: FC<{ height?: number; label?: string }> = ({ height, label }) => {
  height = height ? +height : 100;
  return (
    <div
      css={{
        textAlign: 'center',
        fontSize: '17px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      style={{ height: `${height}px` }}
      data-test-subj="mlLoadingIndicator"
    >
      <EuiLoadingChart size="xl" mono />
      {label && (
        <>
          <EuiSpacer size="s" />
          <div>{label}</div>
        </>
      )}
    </div>
  );
};
