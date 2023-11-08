/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiContextMenuItem } from '@elastic/eui';
import { ALERT_STATUS, ALERT_STATUS_ACTIVE } from '@kbn/rule-data-utils';
import { DefaultRowActionsProps } from './types';
import { useBulkUntrackAlerts } from '../../../..';

/**
 * Alerts table row action to mark the selected alert as untracked
 */
export const MarkAsUntrackedAlertAction = memo(({ alert, refresh }: DefaultRowActionsProps) => {
  const { mutateAsync: untrackAlerts } = useBulkUntrackAlerts();
  const isActiveAlert = useMemo(() => alert[ALERT_STATUS]?.[0] === ALERT_STATUS_ACTIVE, [alert]);

  const handleUntrackAlert = useCallback(async () => {
    await untrackAlerts({
      indices: [alert._index ?? ''],
      alertUuids: [alert._id],
    });
    refresh();
  }, [untrackAlerts, alert._index, alert._id, refresh]);

  if (!isActiveAlert) {
    return null;
  }

  return (
    <EuiContextMenuItem
      data-test-subj="untrackAlert"
      key="untrackAlert"
      size="s"
      onClick={handleUntrackAlert}
    >
      {i18n.translate('xpack.triggersActionsUi.alertsTable.actions.untrack', {
        defaultMessage: 'Mark as untracked',
      })}
    </EuiContextMenuItem>
  );
});
