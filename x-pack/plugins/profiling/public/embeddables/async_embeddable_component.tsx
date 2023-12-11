/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLoadingChart } from '@elastic/eui';
import React from 'react';

interface Props {
  isLoading: boolean;
  children: React.ReactElement;
}

export function AsyncEmbeddableComponent({ children, isLoading }: Props) {
  return (
    <>
      {isLoading ? (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <EuiLoadingChart size="xl" />
        </div>
      ) : (
        <>{children}</>
      )}
    </>
  );
}
