/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPage,
  EuiPageHeader,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { ExperimentalBadge } from '../../components/shared/experimental_badge';
import { usePluginContext } from '../../hooks/use_plugin_context';
import { RouteParams } from '../../routes';
import { AlertsSearchBar } from './alerts_search_bar';
import { AlertItem, AlertsTable } from './alerts_table';
import { wireframeData } from './example_data';

interface AlertsPageProps {
  items?: AlertItem[];
  routeParams: RouteParams<'/alerts'>;
}

export function AlertsPage({ items }: AlertsPageProps) {
  // For now, if we're not passed any items load the example wireframe data.
  if (!items) {
    items = wireframeData;
  }

  const { core } = usePluginContext();
  const { prepend } = core.http.basePath;

  // In a future milestone we'll have a page dedicated to rule management in
  // observability. For now link to the settings page.
  const manageDetectionRulesHref = prepend(
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
            <EuiCallOut
              title={i18n.translate('xpack.observability.alertsDisclaimerTitle', {
                defaultMessage: 'Experimental',
              })}
              color="warning"
              iconType="beaker"
            >
              <p>
                {i18n.translate('xpack.observability.alertsDisclaimerText', {
                  defaultMessage:
                    'This page shows an experimental alerting view. The data shown here will probably not be an accurate representation of alerts. A non-experimental list of alerts is available in the Alerts and Actions settings in Stack Management.',
                })}
              </p>
              <p>
                <EuiLink
                  href={prepend('/app/management/insightsAndAlerting/triggersActions/alerts')}
                >
                  {i18n.translate('xpack.observability.alertsDisclaimerLinkText', {
                    defaultMessage: 'Alerts and Actions',
                  })}
                </EuiLink>
              </p>
            </EuiCallOut>
          </EuiFlexItem>
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
