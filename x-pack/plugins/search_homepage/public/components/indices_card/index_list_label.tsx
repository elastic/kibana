/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';

import { GetIndicesIndexData } from '../../../common/types';

import { IndexListItemMetrics } from './index_metrics';

export interface IndexListLabelProps {
  index: GetIndicesIndexData;
}
export const IndexListLabel = ({ index }: IndexListLabelProps) => {
  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="none"
      alignItems="center"
      justifyContent="spaceBetween"
      style={{ width: '100%' }}
      data-test-subj={`index-panel-label-${index.name}`}
    >
      <EuiFlexItem grow>
        <EuiText size="s">
          <strong>{index.name}</strong>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText color="subdued" size="s">
          <IndexListItemMetrics index={index} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
