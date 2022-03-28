/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiButton, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Process } from '../../../common/types/process_tree';
import { useButtonStyles } from './use_button_styles';

export const ChildrenProcessesButton = ({
  onToggle,
  isExpanded,
}: {
  onToggle: () => void;
  isExpanded: boolean;
}) => {
  const { button, buttonArrow, expandedIcon } = useButtonStyles({ isExpanded });

  return (
    <EuiButton
      key="child-processes-button"
      css={button}
      onClick={onToggle}
      data-test-subj="sessionView:processTreeNodeChildProcessesButton"
    >
      <FormattedMessage id="xpack.sessionView.childProcesses" defaultMessage="Child processes" />
      <EuiIcon css={buttonArrow} size="s" type={expandedIcon} />
    </EuiButton>
  );
};

export const SessionLeaderButton = ({
  process,
  onClick,
  showGroupLeadersOnly,
  childCount,
}: {
  process: Process;
  onClick: () => void;
  showGroupLeadersOnly: boolean;
  childCount: number;
}) => {
  const groupLeaderCount = process.getChildren(false).length;
  const sameGroupCount = childCount - groupLeaderCount;
  const { button, buttonArrow, expandedIcon } = useButtonStyles({
    isExpanded: !showGroupLeadersOnly,
  });

  if (sameGroupCount > 0) {
    return (
      <EuiToolTip
        key="samePgidTooltip"
        position="top"
        content={
          <p>
            <FormattedMessage
              id="xpack.sessionView.groupLeaderTooltip"
              defaultMessage="Hide or show other processes in the same 'process group' (pgid) as the session leader. This typically includes forks from bash builtins, auto completions and other shell startup activity."
            />
          </p>
        }
      >
        <EuiButton
          key="group-leaders-only-button"
          css={button}
          onClick={onClick}
          data-test-subj="sessionView:processTreeNodeChildProcessesButton"
        >
          <FormattedMessage
            id="xpack.sessionView.plusCountMore"
            defaultMessage="+{count} more"
            values={{
              count: sameGroupCount,
            }}
          />
          <EuiIcon css={buttonArrow} size="s" type={expandedIcon} />
        </EuiButton>
      </EuiToolTip>
    );
  }
  return null;
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
