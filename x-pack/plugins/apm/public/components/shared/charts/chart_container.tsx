/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiLoadingChart } from '@elastic/eui';
import React from 'react';

interface Props {
  isLoading: boolean;
  height: number;
  children: React.ReactNode;
}

export function ChartContainer({ isLoading, children, height }: Props) {
  return (
    <div
      style={{
        height,
        display: isLoading ? 'flex' : 'block',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {isLoading && <EuiLoadingChart data-test-subj="loading" size={'xl'} />}
      {children}
    </div>
  );
}
