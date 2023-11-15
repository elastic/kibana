/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext, useMemo } from 'react';
import { ALERT_INSTANCE_ID, ALERT_RULE_UUID } from '@kbn/rule-data-utils';
import { AlertsTableContext } from '../../../../..';
import { Alert } from '../../../../../types';

export const useAlertMutedState = (alert: Alert) => {
  const { mutedAlerts } = useContext(AlertsTableContext);
  const alertInstanceId = alert[ALERT_INSTANCE_ID]![0];
  const ruleId = alert[ALERT_RULE_UUID]![0];
  const rule = mutedAlerts[ruleId];
  return useMemo(
    () => ({
      isMuted: rule?.includes(alertInstanceId),
      ruleId,
      rule,
      alertInstanceId,
    }),
    [alertInstanceId, rule, ruleId]
  );
};
