/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';
import React from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { useSelectedLocation } from '../hooks/use_selected_location';
import { ClientPluginsStart } from '../../../../../plugin';

export const MONITOR_ALERTS_TABLE_ID = 'xpack.observability.slo.sloDetails.alertTable';

export function MonitorDetailsAlerts() {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
    observability: { observabilityRuleTypeRegistry },
  } = useKibana<ClientPluginsStart>().services;

  const { monitorId: configId } = useParams<{ monitorId: string }>();

  const selectedLocation = useSelectedLocation();

  if (!selectedLocation) {
    return <EuiLoadingSpinner size="xl" />;
  }

  return (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <AlertsStateTable
            alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
            configurationId={AlertConsumers.OBSERVABILITY}
            id={MONITOR_ALERTS_TABLE_ID}
            data-test-subj="monitorAlertsTable"
            featureIds={[AlertConsumers.UPTIME, AlertConsumers.OBSERVABILITY]}
            query={{
              bool: {
                filter: [{ term: { configId } }, { term: { 'location.id': selectedLocation?.id } }],
              },
            }}
            showAlertStatusWithFlapping
            initialPageSize={100}
            cellContext={{ observabilityRuleTypeRegistry }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}
