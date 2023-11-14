/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { memo, useCallback, useContext, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { useMuteAlert } from '../hooks/alert_mute/use_mute_alert';
import { AlertActionsProps } from './types';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { MUTE, UNMUTE } from '../hooks/translations';
import { useUnmuteAlert } from '../hooks/alert_mute/use_unmute_alert';

/**
 * Alerts table row action to mute/unmute the selected alert
 */
export const MuteAlertAction = memo(({ alert, refresh, onActionExecuted }: AlertActionsProps) => {
  const { mutedAlerts } = useContext(AlertsTableContext);
  const alertInstanceId = alert['kibana.alert.instance.id']![0];
  const ruleId = alert['kibana.alert.rule.uuid']![0];
  const rule = mutedAlerts[ruleId];
  const isMuted = rule?.includes(alertInstanceId);
  const { mutateAsync: muteAlert } = useMuteAlert();
  const { mutateAsync: unmuteAlert } = useUnmuteAlert();
  const isAlertActive = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);

  const toggleAlert = useCallback(async () => {
    if (isMuted) {
      await unmuteAlert({ ruleId, alertInstanceId });
    } else {
      await muteAlert({ ruleId, alertInstanceId });
    }
    onActionExecuted?.();
    refresh();
  }, [alertInstanceId, isMuted, muteAlert, onActionExecuted, refresh, ruleId, unmuteAlert]);

  if (!isAlertActive) {
    return null;
  }

  return (
    <EuiContextMenuItem
      data-test-subj="toggle-alert"
      onClick={toggleAlert}
      size="s"
      disabled={!rule}
    >
      {!rule
        ? i18n.translate('xpack.triggersActionsUI.alertsTable.loadingMutedState', {
            defaultMessage: 'Loading muted state',
          })
        : isMuted
        ? UNMUTE
        : MUTE}
    </EuiContextMenuItem>
  );
});
