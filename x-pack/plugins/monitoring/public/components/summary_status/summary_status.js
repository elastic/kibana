/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { isEmpty, capitalize } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { StatusIcon } from '../status_icon/index.js';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import './summary_status.scss';

const wrapChild = ({ label, value, ...props }, index) => (
  <EuiFlexItem
    style={{ maxWidth: 200 }}
    key={`summary-status-item-${index}`}
    grow={false}
    {...props}
  >
    <EuiStat
      title={value}
      className="monSummaryStatusNoWrap__stat"
      titleSize="xxxs"
      textAlign="left"
      description={label ? `${label}` : ''}
    />
  </EuiFlexItem>
);

const DefaultIconComponent = ({ status }) => (
  <Fragment>
    <FormattedMessage
      id="xpack.monitoring.summaryStatus.statusIconTitle"
      defaultMessage="Status: {statusIcon}"
      values={{
        statusIcon: (
          <StatusIcon
            type={status.toUpperCase()}
            label={i18n.translate('xpack.monitoring.summaryStatus.statusIconLabel', {
              defaultMessage: 'Status: {status}',
              values: {
                status,
              },
            })}
          />
        ),
      }}
    />
  </Fragment>
);

const StatusIndicator = ({ status, isOnline, IconComponent }) => {
  if (isEmpty(status)) {
    return null;
  }

  return (
    <EuiFlexItem
      className="eui-textTruncate"
      style={{ maxWidth: 200 }}
      key={`summary-status-item-status`}
      grow={false}
    >
      <EuiStat
        title={
          <Fragment>
            <IconComponent status={status} isOnline={isOnline} />
            &nbsp;
            {capitalize(status)}
          </Fragment>
        }
        titleSize="xxxs"
        textAlign="left"
        className="monSummaryStatusNoWrap__stat"
        description={i18n.translate('xpack.monitoring.summaryStatus.statusDescription', {
          defaultMessage: 'Status',
        })}
      />
    </EuiFlexItem>
  );
};

export function SummaryStatus({
  metrics,
  status,
  isOnline,
  IconComponent = DefaultIconComponent,
  ...props
}) {
  return (
    <div {...props} className="monSummaryStatusNoWrap">
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
        <StatusIndicator status={status} IconComponent={IconComponent} isOnline={isOnline} />
        {metrics.map(wrapChild)}
      </EuiFlexGroup>
    </div>
  );
}

SummaryStatus.propTypes = {
  metrics: PropTypes.array.isRequired,
};
