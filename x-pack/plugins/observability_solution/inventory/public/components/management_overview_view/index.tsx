/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup } from '@elastic/eui';
import { InventoryPageHeader } from '../inventory_page_header';
import { InventoryPageHeaderTitle } from '../inventory_page_header/inventory_page_header_title';
import { RoutingDetails } from '../data_stream_management_view/physical_management';

function ManagementOverviewViewContent() {
  return (
    <>
      <EuiFlexGroup direction="column" alignItems="stretch">
        <RoutingDetails height={700} />
      </EuiFlexGroup>
    </>
  );
}

export function ManagementOverviewView() {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <InventoryPageHeader>
        <InventoryPageHeaderTitle
          title={i18n.translate('xpack.inventory.definitionsOverview.pageTitle', {
            defaultMessage: 'Management',
          })}
        />
      </InventoryPageHeader>
      <ManagementOverviewViewContent />
    </EuiFlexGroup>
  );
}
