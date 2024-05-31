/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';

interface Props {
  hasData: boolean;
  height?: string;
  loading?: boolean;
}

export const LoadingWrapper: FC<PropsWithChildren<Props>> = ({
  hasData,
  loading = false,
  height,
  children,
}) => {
  const opacity = loading === true ? (hasData === true ? 0.3 : 0) : 1;

  return (
    <Fragment>
      <div
        style={{
          height: '100%',
          opacity,
          transition: 'opacity 0.2s',
        }}
      >
        {loading && !hasData ? null : children}
      </div>
      {loading === true && (
        <EuiFlexGroup
          justifyContent="spaceAround"
          alignItems="center"
          style={height !== undefined ? { height, marginTop: `-${height}` } : {}}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </Fragment>
  );
};
