/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';

import { PivotGroupByConfig } from '../../common';

interface Props {
  item: PivotGroupByConfig;
  optionsDataId: string;
}

export const GroupByLabelSummary: React.SFC<Props> = ({ item, optionsDataId }) => {
  return 'interval' in item ? (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTextColor color="subdued">{item.interval}</EuiTextColor>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      <EuiFlexItem>{optionsDataId}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
