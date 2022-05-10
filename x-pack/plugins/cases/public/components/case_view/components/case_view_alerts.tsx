/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Case } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana';
import { getManualAlertIds, getFeatureIdsFromAlertIndices } from '../../user_actions/helpers';

interface CaseViewAlertsProps {
  caseData: Case;
}
export const CaseViewAlerts = ({ caseData }: CaseViewAlertsProps) => {
  const { triggersActionsUi } = useKibana().services;

  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: getManualAlertIds(caseData.comments),
      },
    }),
    [caseData.comments]
  );
  const alertFeatureId = useMemo(
    () => getFeatureIdsFromAlertIndices(caseData.comments),
    [caseData.comments]
  );

  const alertStateProps = useMemo(() => {
    const configurationId = alertFeatureId.includes('siem') ? 'securitySolution' : 'observability';
    return {
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId,
      id: `case-details-alerts-${configurationId}`,
      featureIds: alertFeatureId,
      query: alertIdsQuery,
    };
  }, [alertFeatureId, triggersActionsUi.alertsTableConfigurationRegistry, alertIdsQuery]);

  return <>{triggersActionsUi.getAlertsStateTable(alertStateProps)}</>;
};
CaseViewAlerts.displayName = 'CaseViewAlerts';
