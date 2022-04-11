/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useButtonStyles } from './use_button_styles';

export const ChildrenProcessesButton = ({
  onToggle,
  isExpanded,
  disabled,
}: {
  onToggle: () => void;
  isExpanded: boolean;
  disabled: boolean;
}) => {
  const { button, buttonArrow, expandedIcon } = useButtonStyles({ isExpanded });

  return (
    <EuiButton
      key="child-processes-button"
      css={button}
      onClick={onToggle}
      data-test-subj="sessionView:processTreeNodeChildProcessesButton"
      disabled={disabled}
    >
      <FormattedMessage id="xpack.sessionView.childProcesses" defaultMessage="Child processes" />
      <EuiIcon css={buttonArrow} size="s" type={expandedIcon} />
    </EuiButton>
  );
};

export const AlertButton = ({
  isExpanded,
  onToggle,
  alertsCount,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  alertsCount: number;
}) => {
  const { alertButton, alertsCountNumber, buttonArrow, expandedIcon } = useButtonStyles({
    isExpanded,
  });

  return (
    <EuiButton
      key="alert-button"
      css={alertButton}
      onClick={onToggle}
      data-test-subj="processTreeNodeAlertButton"
    >
      {alertsCount > 1 ? (
        <FormattedMessage id="xpack.sessionView.alerts" defaultMessage="Alerts" />
      ) : (
        <FormattedMessage id="xpack.sessionView.alert" defaultMessage="Alert" />
      )}
      {alertsCount > 1 && (
        <span css={alertsCountNumber}>({alertsCount > 99 ? '99+' : alertsCount})</span>
      )}
      <EuiIcon css={buttonArrow} size="s" type={expandedIcon} />
    </EuiButton>
  );
};
