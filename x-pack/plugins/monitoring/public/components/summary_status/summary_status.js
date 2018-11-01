/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, capitalize } from 'lodash';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { StatusIcon } from '../status_icon/index.js';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

const wrapChild = ({ label, value, dataTestSubj }, index) => (
  <EuiFlexItem
    key={`summary-status-item-${index}`}
    grow={false}
    data-test-subj={dataTestSubj}
  >
    <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        {label ? label + ': ' : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <strong>{value}</strong>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFlexItem>
);

const DefaultIconComponent = injectI18n(({ status, intl }) => (
  <Fragment>
    <FormattedMessage
      id="xpack.monitoring.summaryStatus.statusIconTitle"
      defaultMessage="Status: {statusIcon}"
      values={{
        statusIcon: (
          <StatusIcon
            type={status.toUpperCase()}
            label={intl.formatMessage({
              id: 'xpack.monitoring.summaryStatus.statusIconLabel',
              defaultMessage: 'Status: {status}' }, {
              status
            })}
          />
        )
      }}
    />
  </Fragment>
));

const StatusIndicator = ({ status, isOnline, IconComponent }) => {
  if (isEmpty(status)) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false} className="eui-textNoWrap">
        <IconComponent status={status} isOnline={isOnline} />{' '}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {capitalize(status)}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export function SummaryStatus({ metrics, status, isOnline, IconComponent = DefaultIconComponent, ...props }) {
  return (
    <div className="monSummaryStatus" role="status">
      <div {...props}>
        <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              {metrics.map(wrapChild)}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <StatusIndicator status={status} IconComponent={IconComponent} isOnline={isOnline} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
}

SummaryStatus.propTypes = {
  metrics: PropTypes.array.isRequired
};
