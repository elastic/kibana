/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, capitalize } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiStat, EuiHorizontalRule } from '@elastic/eui';
import { StatusIcon } from '../status_icon/index.js';

const wrapChild = ({ label, value, ...props }, index) => (
  <EuiFlexItem
    key={`summary-status-item-${index}`}
    grow={false}
    {...props}
  >
    <EuiStat
      title={value}
      titleSize="s"
      textAlign="left"
      description={label ? `${label}:` : ''}
    />
  </EuiFlexItem>
);

const DefaultIconComponent = ({ status }) => (
  <Fragment>
    Status: {(
      <StatusIcon type={status.toUpperCase()} label={`Status: ${status}`} />
    )}
  </Fragment>
);

const StatusIndicator = ({ status, isOnline, IconComponent }) => {
  if (isEmpty(status)) {
    return null;
  }

  return (
    <EuiFlexItem
      key={`summary-status-item-status`}
      grow={false}
    >
      <EuiStat
        title={(
          <Fragment>
            <IconComponent status={status} isOnline={isOnline} />
              &nbsp;
            {capitalize(status)}
          </Fragment>
        )}
        titleSize="s"
        textAlign="left"
        description="Status:"
      />
    </EuiFlexItem>
  );
};

export function SummaryStatus({ metrics, status, isOnline, IconComponent = DefaultIconComponent, ...props }) {
  return (
    <div {...props}>
      <EuiFlexGroup justifyContent="spaceBetween">
        <StatusIndicator status={status} IconComponent={IconComponent} isOnline={isOnline} />
        {metrics.map(wrapChild)}
      </EuiFlexGroup>
      <EuiHorizontalRule/>
    </div>
  );
}

SummaryStatus.propTypes = {
  metrics: PropTypes.array.isRequired
};
