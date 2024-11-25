/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import React, { Fragment } from 'react';
import { AlertConsumers } from '@kbn/rule-data-utils';

import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SLO_ALERTS_TABLE_ID } from '@kbn/observability-shared-plugin/common';
import { useKibana } from '../../../hooks/use_kibana';

export interface Props {
  slo: SLOWithSummaryResponse;
}

export function SloDetailsAlerts({ slo }: Props) {
  const {
    triggersActionsUi: { alertsTableConfigurationRegistry, getAlertsStateTable: AlertsStateTable },
    observability: { observabilityRuleTypeRegistry },
  } = useKibana().services;

  return (
    <Fragment>
      <EuiSpacer size="l" />
      <EuiFlexGroup direction="column" gutterSize="xl">
        <EuiFlexItem>
          <AlertsStateTable
            alertsTableConfigurationRegistry={alertsTableConfigurationRegistry}
            configurationId={AlertConsumers.OBSERVABILITY}
            id={SLO_ALERTS_TABLE_ID}
            data-test-subj="alertTable"
            featureIds={[AlertConsumers.SLO, AlertConsumers.OBSERVABILITY]}
            query={{
              bool: {
                filter: [
                  { term: { 'slo.id': slo.id } },
                  { term: { 'slo.instanceId': slo.instanceId ?? ALL_VALUE } },
                ],
              },
            }}
            showAlertStatusWithFlapping
            initialPageSize={100}
            cellContext={{ observabilityRuleTypeRegistry }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </Fragment>
  );
}
