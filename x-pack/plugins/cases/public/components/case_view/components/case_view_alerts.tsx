/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { EuiFlexItem, EuiFlexGroup, EuiProgress } from '@elastic/eui';
import type { ValidFeatureId } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { SECURITY_SOLUTION_OWNER } from '../../../../common/constants';
import type { CaseUI } from '../../../../common';
import { useKibana } from '../../../common/lib/kibana';
import { getManualAlertIds } from './helpers';
import { useGetFeatureIds } from '../../../containers/use_get_feature_ids';
import { CaseViewAlertsEmpty } from './case_view_alerts_empty';
import { CaseViewTabs } from '../case_view_tabs';
import { CASE_VIEW_PAGE_TABS } from '../../../../common/types';
interface CaseViewAlertsProps {
  caseData: CaseUI;
}
export const CaseViewAlerts = ({ caseData }: CaseViewAlertsProps) => {
  const { triggersActionsUi } = useKibana().services;

  const alertIds = getManualAlertIds(caseData.comments);
  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: alertIds,
      },
    }),
    [alertIds]
  );

  const { isLoading: isLoadingAlertFeatureIds, data: alertData } = useGetFeatureIds(
    alertIds,
    caseData.owner !== SECURITY_SOLUTION_OWNER
  );

  const configId =
    caseData.owner === SECURITY_SOLUTION_OWNER
      ? `${caseData.owner}-case`
      : !isLoadingAlertFeatureIds
      ? triggersActionsUi.alertsTableConfigurationRegistry.getAlertConfigIdPerRuleTypes(
          alertData?.ruleTypeIds ?? []
        )
      : '';

  const alertStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      id: `case-details-alerts-${caseData.owner}`,
      featureIds: (caseData.owner === SECURITY_SOLUTION_OWNER
        ? [AlertConsumers.SIEM]
        : alertData?.featureIds ?? []) as ValidFeatureId[],
      query: alertIdsQuery,
      showAlertStatusWithFlapping: caseData.owner !== SECURITY_SOLUTION_OWNER,
    }),
    [
      triggersActionsUi.alertsTableConfigurationRegistry,
      configId,
      caseData.owner,
      alertData?.featureIds,
      alertIdsQuery,
    ]
  );

  if (alertIdsQuery.ids.values.length === 0) {
    return (
      <EuiFlexGroup>
        <EuiFlexItem>
          <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
          <CaseViewAlertsEmpty />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return isLoadingAlertFeatureIds ? (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiProgress size="xs" color="primary" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <EuiFlexItem data-test-subj="case-view-alerts">
      <CaseViewTabs caseData={caseData} activeTab={CASE_VIEW_PAGE_TABS.ALERTS} />
      {triggersActionsUi.getAlertsStateTable(alertStateProps)}
    </EuiFlexItem>
  );
};
CaseViewAlerts.displayName = 'CaseViewAlerts';
