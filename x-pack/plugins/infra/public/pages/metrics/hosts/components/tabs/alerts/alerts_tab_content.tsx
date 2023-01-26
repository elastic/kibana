/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { useTriggersActions } from '../../../../../../utils/triggers_actions_context';

export const AlertsTabContent = () => {
  // const { getAlertSummaryWidget: AlertSummaryWidget } = useTriggersActions();

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiFlexItem>
        here goes the alert summary
        {/* <AlertSummaryWidget
          featureIds={infraAlertFeatureIds}
          filter={esQuery}
          fullSize
          timeRange={alertSummaryTimeRange}
          chartThemes={chartThemes}
        /> */}
      </EuiFlexItem>
      <EuiFlexItem>here goes the filter group button</EuiFlexItem>
      <EuiFlexItem>
        Here goes the table
        {/* <CasesContext
          owner={[observabilityFeatureId]}
          permissions={userCasesPermissions}
          features={{ alerts: { sync: false } }}
        >
          {esQuery && (
            <AlertsStateTable
              alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
              configurationId={AlertConsumers.OBSERVABILITY}
              id={ALERTS_TABLE_ID}
              flyoutSize="s"
              featureIds={observabilityAlertFeatureIds}
              query={esQuery}
              showExpandToDetails={false}
              pageSize={ALERTS_PER_PAGE}
            />
          )}
        </CasesContext> */}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
