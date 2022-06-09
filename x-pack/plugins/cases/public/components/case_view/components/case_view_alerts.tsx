/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { AlertsTableFlyoutState } from '@kbn/triggers-actions-ui-plugin/public';
import { EuiFlexItem, EuiFlexGroup, EuiProgress } from '@elastic/eui';
import { Case } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana';
import { getManualAlertIds, getRegistrationContextFromAlerts } from './helpers';
import { useGetFeatureIds } from '../../../containers/use_get_feature_ids';
import { CaseViewAlertsEmpty } from './case_view_alerts_empty';

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

  const status = useGetFeatureIds(alertRegistrationContexts);
  console.log(status);
  const { isLoading: isLoadingAlertFeatureIds, alertFeatureIds } = status;

  const alertStateProps = {
    alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
    configurationId: caseData.owner,
    id: `case-details-alerts-${caseData.owner}`,
    flyoutState: alertFeatureIds.includes('siem') // what is siem?
      ? AlertsTableFlyoutState.internal
      : AlertsTableFlyoutState.external,
    featureIds: alertFeatureIds,
    query: alertIdsQuery,
    showExpandToDetails: alertFeatureIds.includes('siem'),
  };

  if (alertIdsQuery.ids.values.length === 0) {
    return <CaseViewAlertsEmpty />;
  }

  return isLoadingAlertFeatureIds ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    triggersActionsUi.getAlertsStateTable(alertStateProps)
  );
};
CaseViewAlerts.displayName = 'CaseViewAlerts';
