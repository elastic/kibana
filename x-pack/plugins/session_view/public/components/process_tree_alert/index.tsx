/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiIcon, EuiText, EuiButtonIcon } from '@elastic/eui';
import { ProcessEvent, ProcessEventAlert } from '../../../common/types/process_tree';
import { dataOrDash } from '../../utils/data_or_dash';
import { getBadgeColorFromAlertStatus } from './helpers';
import { useStyles } from './styles';

export interface ProcessTreeAlertDeps {
  alert: ProcessEvent;
  isInvestigated: boolean;
  isSelected: boolean;
  onClick: (alert: ProcessEventAlert | null) => void;
  selectAlert: (alertUuid: string) => void;
  onShowAlertDetails: (alertUuid: string) => void;
}

export const ProcessTreeAlert = ({
  alert,
  isInvestigated,
  isSelected,
  onClick,
  selectAlert,
  onShowAlertDetails,
}: ProcessTreeAlertDeps) => {
  const styles = useStyles({ isInvestigated, isSelected });

  const { event } = alert;
  const { uuid, rule, workflow_status: status } = alert.kibana?.alert || {};

  useEffect(() => {
    if (isInvestigated && uuid) {
      selectAlert(uuid);
    }
  }, [isInvestigated, uuid, selectAlert]);

  const handleExpandClick = useCallback(() => {
    if (uuid) {
      onShowAlertDetails(uuid);
    }
  }, [onShowAlertDetails, uuid]);

  const handleClick = useCallback(() => {
    if (alert.kibana?.alert) {
      onClick(alert.kibana.alert);
    }
  }, [alert.kibana?.alert, onClick]);

  if (!(alert.kibana && rule)) {
    return null;
  }

  const { name } = rule;

  return (
    <div key={uuid} css={styles.alert} data-id={uuid}>
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        wrap
        onClick={handleClick}
        data-test-subj={`sessionView:sessionViewAlertDetail-${uuid}`}
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="expand"
            aria-label="expand"
            data-test-subj={`sessionView:sessionViewAlertDetailExpand-${uuid}`}
            onClick={handleExpandClick}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="alert" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText css={styles.alertName} size="s">
            {dataOrDash(name)}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color={getBadgeColorFromAlertStatus(status)} css={styles.alertStatus}>
            {dataOrDash(status)}
          </EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge css={styles.actionBadge}>{event?.action}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
