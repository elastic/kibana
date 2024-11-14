/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttackDiscovery, Replacements } from '@kbn/elastic-assistant-common';
import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import React, { useMemo } from 'react';

import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTableComponent } from '../../../../detections/components/alerts_table';

interface Props {
  attackDiscovery: AttackDiscovery;
  replacements?: Replacements;
}

const AlertsTabComponent: React.FC<Props> = ({ attackDiscovery, replacements }) => {
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

  return (
    <div data-test-subj="alertsTab">
      <AlertsTableComponent
        id={`attack-discovery-alerts-${attackDiscovery.id}`}
        tableType={TableId.alertsOnCasePage}
        featureIds={[AlertConsumers.SIEM]}
        query={alertIdsQuery}
        showAlertStatusWithFlapping={false}
      />
    </div>
  );
};

AlertsTabComponent.displayName = 'AlertsTab';

export const AlertsTab = React.memo(AlertsTabComponent);
