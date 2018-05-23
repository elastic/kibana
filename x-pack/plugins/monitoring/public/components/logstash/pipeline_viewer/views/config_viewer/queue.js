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

export function Queue() {
  return (
    <div className="statement">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon type="logstashQueue" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle>
            <h3>Queue</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div>
        Queue stats not available
      </div>
    </div>
  );
}
