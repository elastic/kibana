/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { AlertConsumers } from '@kbn/rule-data-utils';
import { getAlertsTableStateLazy } from '../../../../common/get_alerts_table_state';
import { PLUGIN_ID } from '../../../../common/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { AlertsTableConfigurationRegistry } from '../../../../types';
import { TypeRegistry } from '../../../type_registry';

const consumers = [
  AlertConsumers.APM,
  AlertConsumers.LOGS,
  AlertConsumers.UPTIME,
  AlertConsumers.INFRASTRUCTURE,
];

const AlertsPage: React.FunctionComponent = () => {
  const { alertsTableConfigurationRegistry } = useKibana().services;

  const alertStateProps = {
    alertsTableConfigurationRegistry:
      alertsTableConfigurationRegistry as TypeRegistry<AlertsTableConfigurationRegistry>,
    configurationId: PLUGIN_ID,
    id: `internal-alerts-page`,
    featureIds: consumers,
    query: { bool: { must: [] } },
    showExpandToDetails: true,
  };

  return (
    <section>
      <h1>THIS IS AN INTERNAL TEST PAGE</h1>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem grow={true}>{getAlertsTableStateLazy(alertStateProps)}</EuiFlexItem>
      </EuiFlexGroup>
    </section>
  );
};

export { AlertsPage };
