/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiTitle, EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const ENTITIES_COUNT_BADGE = i18n.translate(
  'xpack.inventory.inventoryGroupPanel.entitiesBadgeLabel',
  { defaultMessage: 'Entities' }
);

function InventoryPanelBadge({
  name,
  value,
  'data-test-subj': dataTestSubj,
}: {
  name: string;
  'data-test-subj'?: string;
  value: string | number;
}) {
  return (
    <div data-test-subj={dataTestSubj}>
      <span className="inventoryPanelBadge">{name}:</span>
      <EuiBadge color="hollow">{value}</EuiBadge>
    </div>
  );
}

export function InventoryGroupPanel({ field, entities }: { field: string; entities: number }) {
  return (
    <div data-test-subj={`inventory-group-panel-${field}`} className="inventoryGroupPanel">
      <EuiFlexGroup>
        <EuiFlexItem grow>
          <EuiTitle size="xs">
            <h4>{field}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <InventoryPanelBadge
            data-test-subj="inventory-panel-badge-entities-count"
            name={ENTITIES_COUNT_BADGE}
            value={entities}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
}
