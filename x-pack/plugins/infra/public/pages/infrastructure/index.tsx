/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

import React from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { RoutedTabs } from '../../components/navigation/routed_tabs';
import { ColumnarPage } from '../../components/page';
import { Header } from '../../components/header';
import { MetricsExplorerOptionsContainer } from '../../containers/metrics_explorer/use_metrics_explorer_options';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { WithSource } from '../../containers/with_source';
import { Source } from '../../containers/source';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './snapshot';
import { MetricsSettingsPage } from './settings';
import { AppNavigation } from '../../components/navigation/app_navigation';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { WaffleOptionsProvider } from '../inventory_view/hooks/use_waffle_options';
import { WaffleTimeProvider } from '../inventory_view/hooks/use_waffle_time';
import { WaffleFiltersProvider } from '../inventory_view/hooks/use_waffle_filters';
import { AlertDropdown } from '../../components/alerting/metrics/alert_dropdown';

export const InfrastructurePage = ({ match }: RouteComponentProps) => {
  const uiCapabilities = useKibana().services.application?.capabilities;

  return (
    <Source.Provider sourceId="default">
      <WaffleOptionsProvider>
        <WaffleTimeProvider>
          <WaffleFiltersProvider>
            <ColumnarPage>
              <DocumentTitle
                title={i18n.translate('xpack.infra.homePage.documentTitle', {
                  defaultMessage: 'Metrics',
                })}
              />

              <HelpCenterContent
                feedbackLink="https://discuss.elastic.co/c/metrics"
                appName={i18n.translate('xpack.infra.header.infrastructureHelpAppName', {
                  defaultMessage: 'Metrics',
                })}
              />

              <Header
                breadcrumbs={[
                  {
                    text: i18n.translate('xpack.infra.header.infrastructureTitle', {
                      defaultMessage: 'Metrics',
                    }),
                  },
                ]}
                readOnlyBadge={!uiCapabilities?.infrastructure?.save}
              />
              <AppNavigation
                aria-label={i18n.translate('xpack.infra.header.infrastructureNavigationTitle', {
                  defaultMessage: 'Metrics',
                })}
              >
                <EuiFlexGroup gutterSize={'none'} alignItems={'center'}>
                  <EuiFlexItem>
                    <RoutedTabs
                      tabs={[
                        {
                          app: 'metrics',
                          title: i18n.translate('xpack.infra.homePage.inventoryTabTitle', {
                            defaultMessage: 'Inventory',
                          }),
                          pathname: '/inventory',
                        },
                        {
                          app: 'metrics',
                          title: i18n.translate('xpack.infra.homePage.metricsExplorerTabTitle', {
                            defaultMessage: 'Metrics Explorer',
                          }),
                          pathname: '/explorer',
                        },
                        {
                          app: 'metrics',
                          title: i18n.translate('xpack.infra.homePage.settingsTabTitle', {
                            defaultMessage: 'Settings',
                          }),
                          pathname: '/settings',
                        },
                      ]}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <Route path={'/explorer'} component={AlertDropdown} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </AppNavigation>

              <Switch>
                <Route path={'/inventory'} component={SnapshotPage} />
                <Route
                  path={'/explorer'}
                  render={props => (
                    <WithSource>
                      {({ configuration, createDerivedIndexPattern }) => (
                        <MetricsExplorerOptionsContainer.Provider>
                          <WithMetricsExplorerOptionsUrlState />
                          {configuration ? (
                            <MetricsExplorerPage
                              derivedIndexPattern={createDerivedIndexPattern('metrics')}
                              source={configuration}
                              {...props}
                            />
                          ) : (
                            <SourceLoadingPage />
                          )}
                        </MetricsExplorerOptionsContainer.Provider>
                      )}
                    </WithSource>
                  )}
                />
                <Route path={'/settings'} component={MetricsSettingsPage} />
              </Switch>
            </ColumnarPage>
          </WaffleFiltersProvider>
        </WaffleTimeProvider>
      </WaffleOptionsProvider>
    </Source.Provider>
  );
};
