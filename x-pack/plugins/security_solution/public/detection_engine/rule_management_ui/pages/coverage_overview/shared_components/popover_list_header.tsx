/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiText, EuiNotificationBadge } from '@elastic/eui';
import React from 'react';

export const CoverageOverviewRuleListHeader = ({
  listTitle,
  listLength,
}: {
  listTitle: string;
  listLength: number;
}) => {
  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiText size="s">
          <h4>{listTitle}</h4>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiNotificationBadge size="m" color="subdued">
          {listLength}
        </EuiNotificationBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
