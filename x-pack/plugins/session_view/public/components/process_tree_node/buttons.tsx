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
import { useButtonStyles } from './useButtonStyles';

export const ChildrenProcessesButton = ({
  onToggle,
  isExpanded,
}: {
  onToggle: () => void;
  isExpanded: boolean;
}) => {
  const { button, buttonArrow, getExpandedIcon } = useButtonStyles();

  return (
    <EuiButton
      key="child-processes-button"
      css={button}
      onClick={onToggle}
      data-test-subj="sessionView:processTreeNodeChildProcessesButton"
    >
      <FormattedMessage id="xpack.sessionView.childProcesses" defaultMessage="Child processes" />
      <EuiIcon css={buttonArrow} size="s" type={getExpandedIcon(isExpanded)} />
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
  const { button, buttonArrow, getExpandedIcon } = useButtonStyles();

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
          <EuiIcon css={buttonArrow} size="s" type={getExpandedIcon(showGroupLeadersOnly)} />
        </EuiButton>
      </EuiToolTip>
    );
  }
  return null;
};

export const AlertButton = ({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const { alertButton, buttonArrow, getExpandedIcon } = useButtonStyles();

  return (
    <EuiButton
      key="alert-button"
      css={alertButton}
      onClick={onToggle}
      data-test-subj="processTreeNodeAlertButton"
    >
      <FormattedMessage id="xpack.sessionView.alerts" defaultMessage="Alerts" />
      <EuiIcon css={buttonArrow} size="s" type={getExpandedIcon(isExpanded)} />
    </EuiButton>
  );
};
