/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { Case } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana';
import { getManualAlertIds, getRegistrationContextFromAlerts } from './helpers';
import { useGetFeatureIds } from '../../../containers/use_get_feature_ids';

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
  const alertRegistrationContexts = useMemo(
    () => getRegistrationContextFromAlerts(caseData.comments),
    [caseData.comments]
  );

  const alertFeatureIds = useGetFeatureIds(alertRegistrationContexts);

  const alertStateProps = useMemo(() => {
    const configurationId = caseData.owner;
    return {
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId,
      id: `case-details-alerts-${configurationId}`,
      featureIds: alertFeatureIds,
      query: alertIdsQuery,
    };
  }, [
    caseData.owner,
    triggersActionsUi.alertsTableConfigurationRegistry,
    alertFeatureIds,
    alertIdsQuery,
  ]);

  return <>{triggersActionsUi.getAlertsStateTable(alertStateProps)}</>;
};
CaseViewAlerts.displayName = 'CaseViewAlerts';
