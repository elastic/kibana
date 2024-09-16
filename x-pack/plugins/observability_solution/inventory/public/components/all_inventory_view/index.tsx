/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { EntityTable } from '../entity_table';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';

export function AllInventoryView() {
  return (
    <EuiFlexGroup direction="column">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle
          title={i18n.translate(
            'xpack.inventory.allInventoryView.inventoryPageHeaderTitle.allEntitiesLabel',
            { defaultMessage: 'All entities' }
          )}
        />
      </InventoryPageHeader>
      <EntityTable type="all" />
    </EuiFlexGroup>
  );
}
