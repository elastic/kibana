/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPage,
  EuiPageHeader,
  EuiSearchBar,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

/**
 * This is just a placeholder for a working search bar.
 */
function SearchBar() {
  return (
    <EuiSearchBar
      box={{
        placeholder: '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
      }}
      filters={[
        {
          type: 'field_value_toggle_group',
          field: 'status',
          items: [
            {
              value: 'open',
              name: 'Open',
            },
            {
              value: 'inProgress',
              name: 'In progress',
            },
            {
              value: 'closed',
              name: 'Closed',
            },
          ],
        },
      ]}
    />
  );
}

function List() {
  return <>No alerts</>;
}

export function AlertsPage() {
  return (
    <EuiPage>
      <EuiPageHeader
        pageTitle={i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })}
        rightSideItems={[
          <EuiButton fill>
            {i18n.translate('xpack.observability.manageDetectionRulesButtonLabel', {
              defaultMessage: 'Manage detection rules',
            })}
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <SearchBar />
          </EuiFlexItem>
          <EuiFlexItem>
            <List />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
