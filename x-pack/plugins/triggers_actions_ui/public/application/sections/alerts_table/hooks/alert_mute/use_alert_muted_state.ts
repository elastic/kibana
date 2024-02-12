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
  const alertInstanceId = alert[ALERT_INSTANCE_ID]?.[0];
  const ruleId = alert[ALERT_RULE_UUID]?.[0];
  return useMemo(() => {
    const rule = ruleId ? mutedAlerts[ruleId] : [];
    return {
      isMuted: alertInstanceId ? rule?.includes(alertInstanceId) : null,
      ruleId,
      rule,
      alertInstanceId,
    };
  }, [alertInstanceId, mutedAlerts, ruleId]);
};
