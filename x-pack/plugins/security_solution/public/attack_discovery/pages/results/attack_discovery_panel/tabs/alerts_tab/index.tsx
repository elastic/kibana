/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import React, { useMemo } from 'react';

import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../../../../common/constants';
import { useKibana } from '../../../../../../common/lib/kibana';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}

const AlertsTabComponent: React.FC<Props> = ({ attackDiscovery, replacements }) => {
  const { triggersActionsUi } = useKibana().services;

  const originalAlertIds = useMemo(
    () =>
      attackDiscovery.alertIds.map((alertId) =>
        replacements != null ? replacements[alertId] ?? alertId : alertId
      ),
    [attackDiscovery.alertIds, replacements]
  );

  const alertIdsQuery = useMemo(
    () => ({
      ids: {
        values: originalAlertIds,
      },
    }),
    [originalAlertIds]
  );

  const configId = ALERTS_TABLE_REGISTRY_CONFIG_IDS.CASE; // show the same row-actions as in the case view

  const alertStateProps = useMemo(
    () => ({
      alertsTableConfigurationRegistry: triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: configId,
      id: `attack-discovery-alerts-${attackDiscovery.id}`,
      featureIds: [AlertConsumers.SIEM],
      query: alertIdsQuery,
      showAlertStatusWithFlapping: false,
    }),
    [
      alertIdsQuery,
      attackDiscovery.id,
      configId,
      triggersActionsUi.alertsTableConfigurationRegistry,
    ]
  );

  return (
    <div data-test-subj="alertsTab">{triggersActionsUi.getAlertsStateTable(alertStateProps)}</div>
  );
};

AlertsTabComponent.displayName = 'AlertsTab';

export const AlertsTab = React.memo(AlertsTabComponent);
