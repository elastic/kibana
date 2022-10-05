/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import React from 'react';

import { Pattern } from '../pattern';
import type { EcsMetadata } from '../../types';

interface Props {
  ecsMetadata: Record<string, EcsMetadata> | null;
  error: string | null;
  loading: boolean;
  patterns: string[];
  version: string | null;
  versionLoading: boolean;
}

const BodyComponent: React.FC<Props> = ({
  ecsMetadata,
  error,
  loading,
  patterns,
  version,
  versionLoading,
}) => {
  const allDataLoaded =
    !loading && !versionLoading && error == null && ecsMetadata != null && version != null;

  return (
    <>
      {error != null ? (
        <EuiEmptyPrompt color="danger" iconType="alert" title={<h2>{error}</h2>} />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="none">
          {allDataLoaded &&
            patterns.map((pattern, i) => (
              <EuiFlexItem grow={false} key={pattern}>
                <Pattern
                  ecsMetadata={ecsMetadata}
                  key={pattern}
                  pattern={pattern}
                  version={version}
                />
                {i !== patterns.length - 1 ? <EuiSpacer size="m" /> : null}
              </EuiFlexItem>
            ))}
        </EuiFlexGroup>
      )}
    </>
  );
};

export const Body = React.memo(BodyComponent);
