/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { capitalize } from 'lodash';
import { EuiFlexGroup, EuiFlexItem, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { StatusIcon, StatusIconProps } from '../status_icon';
import { AlertsStatus } from '../../alerts/status';
import type { AlertsByName } from '../../alerts/types';
import './summary_status.scss';

interface Metrics {
  label: string;
  value: string | number;
  [key: string]: unknown;
}

interface SummaryProps {
  StatusIndicator?: typeof DefaultStatusIndicator;
  status?: string;
  isOnline?: boolean;
  IconComponent?: typeof DefaultIconComponent;
  alerts?: AlertsByName;
  metrics: Metrics[];
  'data-test-subj': string;
}

interface IndicatorProps {
  status?: string;
  isOnline?: boolean;
  IconComponent: typeof DefaultIconComponent;
}

const wrapChild = ({ label, value, ...props }: Metrics, index: number) => (
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

interface IconProps {
  status: string;
  isOnline?: boolean;
}

const DefaultIconComponent = ({ status }: IconProps) => (
  <Fragment>
    <FormattedMessage
      id="xpack.monitoring.summaryStatus.statusIconTitle"
      defaultMessage="Status: {statusIcon}"
      values={{
        statusIcon: (
          <StatusIcon
            type={status.toUpperCase() as StatusIconProps['type']}
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

export const DefaultStatusIndicator = ({
  status,
  IconComponent,
  isOnline = false,
}: IndicatorProps) => {
  if (!status?.length) {
    return null;
  }

  return (
    <EuiStat
      data-test-subj="status"
      title={
        <>
          <IconComponent status={status} isOnline={isOnline} />
          &nbsp;
          {capitalize(status)}
        </>
      }
      titleSize="xxxs"
      textAlign="left"
      className="monSummaryStatusNoWrap__stat"
      description={i18n.translate('xpack.monitoring.summaryStatus.statusDescription', {
        defaultMessage: 'Status',
      })}
    />
  );
};

export function SummaryStatus({
  metrics,
  alerts,
  status,
  isOnline = false,
  IconComponent = DefaultIconComponent,
  StatusIndicator = DefaultStatusIndicator,
  ...props
}: SummaryProps) {
  return (
    <div {...props} className="monSummaryStatusNoWrap">
      <EuiFlexGroup gutterSize="m" alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem
          className="eui-textTruncate"
          style={{ maxWidth: 200 }}
          key={`summary-status-item-status`}
          grow={false}
        >
          <StatusIndicator status={status} isOnline={isOnline} IconComponent={IconComponent} />
        </EuiFlexItem>
        {alerts ? (
          <EuiFlexItem grow={false}>
            <EuiStat
              title={<AlertsStatus showOnlyCount={true} alerts={alerts} />}
              titleSize="xxxs"
              textAlign="left"
              className="monSummaryStatusNoWrap__stat"
              description={i18n.translate('xpack.monitoring.summaryStatus.alertsDescription', {
                defaultMessage: 'Alerts',
              })}
            />
          </EuiFlexItem>
        ) : null}
        {metrics.map(wrapChild)}
      </EuiFlexGroup>
    </div>
  );
}
