/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiContextMenuItem } from '@elastic/eui';
import React, { useContext } from 'react';
import { i18n } from '@kbn/i18n';
import { useMuteAlert } from '../hooks/use_mute_alert';
import { AlertsTableContext } from '../contexts/alerts_table_context';
import { RenderCustomActionsRowArgs } from '../../../../types';
import { MUTE, UNMUTE } from '../hooks/translations';
import { useUnmuteAlert } from '../hooks/use_unmute_alert';

/**
 * Action to mute/unmute the selected alert
 */
export const ToggleAction = ({ alert }: RenderCustomActionsRowArgs) => {
  const { mutedAlerts } = useContext(AlertsTableContext);
  const alertInstanceId = alert['kibana.alert.instance.id']![0];
  const ruleId = alert['kibana.alert.rule.uuid']![0];
  const rule = mutedAlerts[ruleId];
  const isMuted = rule?.includes(alertInstanceId);
  const { mutate: muteAlert } = useMuteAlert();
  const { mutate: unmuteAlert } = useUnmuteAlert();

  const toggleAlert = () => {
    if (isMuted) {
      unmuteAlert({ ruleId, alertInstanceId });
    }
    muteAlert({ ruleId, alertInstanceId });
  };

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
};
