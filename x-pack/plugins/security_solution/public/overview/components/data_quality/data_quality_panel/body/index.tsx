/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';

import React from 'react';

import { Pattern } from '../pattern';
import type { EcsMetadata } from '../../types';

interface Props {
  ecsMetadata: Record<string, EcsMetadata>;
  patterns: string[];
  version: string;
}

const BodyComponent: React.FC<Props> = ({ ecsMetadata, patterns, version }) => (
  <EuiFlexGroup direction="column" gutterSize="none">
    {patterns.map((pattern, i) => (
      <EuiFlexItem grow={false} key={pattern}>
        <Pattern
          ecsMetadata={ecsMetadata}
          expandFirstResult={i === 0}
          key={pattern}
          pattern={pattern}
          version={version}
        />
        {i !== patterns.length - 1 ? <EuiSpacer size="m" /> : null}
      </EuiFlexItem>
    ))}
  </EuiFlexGroup>
);

export const Body = React.memo(BodyComponent);
