/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { MouseEvent, useMemo, type ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink } from '@elastic/eui';
import { ALERT_STATUS_ACTIVE, AlertStatus } from '@kbn/rule-data-utils';
import { ActiveAlertCounts } from './active_alert_counts';
import { AllAlertCounts } from './all_alert_counts';

interface Props {
  activeAlertCount: number;
  recoveredAlertCount: number;
  handleClick?: (
    event: MouseEvent<HTMLAnchorElement | HTMLDivElement>,
    status?: AlertStatus
  ) => void;
}

/** @internal **/
const AlertItem = ({
  children,
  onClick,
  'data-test-subj': dataTestSubj,
}: {
  'data-test-subj'?: string;
  children?: ReactNode;
  onClick: ((event: React.MouseEvent<HTMLAnchorElement>) => void) | undefined;
}) => (
  <EuiFlexItem
    style={{ minWidth: 50, wordWrap: 'break-word' }}
    grow={false}
    data-test-subj={dataTestSubj}
  >
    {onClick ? <EuiLink onClick={onClick}>{children}</EuiLink> : children}
  </EuiFlexItem>
);

export const AlertCounts = ({ activeAlertCount, recoveredAlertCount, handleClick }: Props) => {
  const onAllClick = useMemo(
    () =>
      handleClick
        ? (event: React.MouseEvent<HTMLAnchorElement>) => {
            handleClick(event);
          }
        : undefined,
    [handleClick]
  );

  const onActiveClick = useMemo(
    () =>
      handleClick
        ? (event: React.MouseEvent<HTMLAnchorElement>) => {
            handleClick(event, ALERT_STATUS_ACTIVE);
          }
        : undefined,
    [handleClick]
  );

  return (
    <EuiFlexGroup gutterSize="l" responsive={false}>
      <AlertItem onClick={onAllClick} data-test-subj="allAlerts">
        <AllAlertCounts count={activeAlertCount + recoveredAlertCount} />
      </AlertItem>

      <AlertItem onClick={onActiveClick} data-test-subj="activeAlerts">
        <ActiveAlertCounts activeAlertCount={activeAlertCount} />
      </AlertItem>
    </EuiFlexGroup>
  );
};
