/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTitle
} from '@elastic/eui';

export function StatementListHeading({
  iconType,
  title
}) {
  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon
          size="s"
          type={iconType}
          className="cv-statementList__icon"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
