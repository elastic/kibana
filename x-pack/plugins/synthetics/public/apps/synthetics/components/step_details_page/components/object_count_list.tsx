/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { useObjectMetrics } from '../hooks/use_object_metrics';
import { ColorPalette } from './object_weight_list';

export const ObjectCountList = () => {
  const objectMetrics = useObjectMetrics();

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h3>Object count</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            Total: <span style={{ fontWeight: 'bold' }}> {objectMetrics.totalObjects}</span>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <div>
        {objectMetrics.items.map(({ label, mimeType, percent, count }) => (
          <>
            <ColorPalette
              label={label}
              mimeType={mimeType}
              percent={percent}
              value={String(count)}
            />
            <EuiSpacer size="m" />
          </>
        ))}
      </div>
    </>
  );
};
