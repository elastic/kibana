/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo } from 'react';
import { EuiButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AlertTypeCount } from '../../../common/types/process_tree';
import { useButtonStyles } from './use_button_styles';
import { ALERT_ICONS } from '../../../common/constants';

const MAX_ALERT_COUNT = 99;

export const CHILD_PROCESSES = i18n.translate('xpack.sessionView.childProcesses', {
  defaultMessage: 'Child processes',
});

export const ALERTS = i18n.translate('xpack.sessionView.alerts', {
  defaultMessage: 'Alerts',
});

export const ALERT = i18n.translate('xpack.sessionView.alert', {
  defaultMessage: 'Alert',
});

export const OUTPUT = i18n.translate('xpack.sessionView.output', {
  defaultMessage: 'Output',
});

export const ChildrenProcessesButton = ({
  onToggle,
  isExpanded,
}: {
  onToggle: () => void;
  isExpanded: boolean;
}) => {
  const { button, buttonArrow } = useButtonStyles();

  return (
    <EuiButton
      className={isExpanded ? 'isExpanded' : ''}
      key="child-processes-button"
      css={button}
      onClick={onToggle}
      data-test-subj="sessionView:processTreeNodeChildProcessesButton"
      aria-label={CHILD_PROCESSES}
    >
      {CHILD_PROCESSES}
      <EuiIcon css={buttonArrow} size="s" type="arrowDown" />
    </EuiButton>
  );
};

export const AlertButton = ({
  isExpanded,
  alertTypeCounts,
  onToggle,
  alertsCount,
}: {
  isExpanded: boolean;
  alertTypeCounts: AlertTypeCount[];
  onToggle: () => void;
  alertsCount: number;
}) => {
  const { alertButton, buttonArrow } = useButtonStyles();

  const alertIcons: string[] = useMemo(
    () =>
      alertTypeCounts
        ?.filter((alertTypeCount) => alertTypeCount.count > 0)
        ?.map(({ category }, i) => ALERT_ICONS[category]),
    [alertTypeCounts]
  );

  return (
    <EuiButton
      className={isExpanded ? 'isExpanded' : ''}
      key="alert-button"
      css={alertButton}
      onClick={onToggle}
      data-test-subj="processTreeNodeAlertButton"
      aria-label={ALERTS}
    >
      {alertsCount > 1 ? ALERTS : ALERT}
      {alertsCount > 1 &&
        (alertsCount > MAX_ALERT_COUNT ? ` (${MAX_ALERT_COUNT}+)` : ` (${alertsCount})`)}
      {alertIcons?.map((icon: string) => (
        <EuiIcon className="alertIcon" key={icon} size="s" type={icon} />
      ))}
      <EuiIcon css={buttonArrow} size="s" type="arrowDown" />
    </EuiButton>
  );
};

export const OutputButton = ({ onClick }: { onClick: () => void }) => {
  const { outputButton, buttonArrow } = useButtonStyles();

  return (
    <EuiButton
      key="output-button"
      css={outputButton}
      onClick={onClick}
      data-test-subj="processTreeNodeOutpuButton"
      aria-label={OUTPUT}
    >
      {OUTPUT}
      <EuiIcon css={buttonArrow} size="s" type="arrowRight" />
    </EuiButton>
  );
};
