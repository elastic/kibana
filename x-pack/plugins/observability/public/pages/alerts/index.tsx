/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiPage, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertItem, AlertsTable } from './alerts_table';

interface AlertsPageProps {
  items?: AlertItem[];
  routeParams: RouteParams<'/alerts'>;
}

export function AlertsPage({ items = [] }: AlertsPageProps) {
  const { core } = usePluginContext();

  // In a future milestone we'll have a page dedicated to rule management in
  // observability. For now link to the settings page.
  const manageDetectionRulesHref = core.http.basePath.prepend(
    '/app/management/insightsAndAlerting/triggersActions/alerts'
  );

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
          <EuiButton fill href={manageDetectionRulesHref} iconType="gear">
            {i18n.translate('xpack.observability.alerts.manageDetectionRulesButtonLabel', {
              defaultMessage: 'Manage detection rules',
            })}
          </EuiButton>,
        ]}
      >
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <AlertsSearchBar />
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertsTable items={items} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageHeader>
    </EuiPage>
  );
}
