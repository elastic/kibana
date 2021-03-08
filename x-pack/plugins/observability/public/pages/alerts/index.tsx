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
import { SearchBar, TimeHistory } from '../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { RouteParams } from '../../routes';
import { AlertItem, AlertsTable } from './alerts_table';

/**
 * This is just a placeholder for a working search bar.
 */
// function SearchBar() {
//   return (
//     <EuiSearchBar
//       box={{
//         placeholder: '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
//       }}
//       filters={[
//         {
//           type: 'field_value_toggle_group',
//           field: 'status',
//           items: [
//             {
//               value: 'open',
//               name: 'Open',
//             },
//             {
//               value: 'inProgress',
//               name: 'In progress',
//             },
//             {
//               value: 'closed',
//               name: 'Closed',
//             },
//           ],
//         },
//       ]}
//     />
//   );
// }

interface AlertsPageProps {
  items?: AlertItem[];
  routeParams: RouteParams<'/alerts'>;
}

export function AlertsPage({ items = [] }: AlertsPageProps) {
  return (
    <EuiPage>
      <EuiPageHeader
        pageTitle={
          <>
            {i18n.translate('xpack.observability.alertsTitle', { defaultMessage: 'Alerts' })}{' '}
            <ExperimentalBadge />
          </>
        }
        rightSideItems={[
          <EuiButton fill iconType="gear">
            {i18n.translate('xpack.observability.alerts.manageDetectionRulesButtonLabel', {
              defaultMessage: 'Manage detection rules',
            })}
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <SearchBar
              indexPatterns={[]}
              placeholder='"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)'
              query={{ query: '', language: 'kuery' }}
              timeHistory={new TimeHistory(new Storage(localStorage))}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsTable items={items} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
