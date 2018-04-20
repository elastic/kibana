/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { isEmpty, capitalize } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { StatusIcon } from 'plugins/monitoring/components';

const wrapChild = ({ label, value, dataTestSubj }, index) => (
  <EuiFlexItem
    key={`summary-status-item-${index}`}
    grow={false}
    className="monitoring-summary-status__eui-content"
  >
    {label}: <strong data-test-subj={dataTestSubj}>{value}</strong>
  </EuiFlexItem>
);

const StatusIndicator = ({ status }) => {
  if (isEmpty(status)) {
    return null;
  }

  return (
    <div className="monitoring-summary-status__status-indicator">
      Health: <StatusIcon type={status.toUpperCase()} label={status} />{' '}
      {capitalize(status)}
    </div>
  );
};

export function SummaryStatus({ children, status, ...props }) {
  return (
    <div className="monitoring-summary-status" role="status">
      <div className="monitoring-summary-status__content" {...props}>
        <EuiFlexGroup gutterSize="xs" alignItems="center">
          {children.map(wrapChild)}

          <EuiFlexItem
            grow={true}
            className="monitoring-summary-status__eui-content"
          >
            <StatusIndicator status={status} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}
