/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiErrorBoundary, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Route, Switch } from 'react-router-dom';
import type { IIndexPattern } from '../../../../../../src/plugins/data/common/index_patterns/types';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public/context/context';
import { HeaderMenuPortal } from '../../../../observability/public/components/shared';
import type { MetricsSourceConfigurationProperties } from '../../../common/metrics_sources';
import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { Source } from '../../containers/metrics_source/source';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { SavedViewProvider } from '../../containers/saved_view/saved_view';
import { WithSource } from '../../containers/with_source/with_source';
import { useLinkProps } from '../../hooks/use_link_props';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { SnapshotPage } from './inventory_view';
import { AnomalyDetectionFlyout } from './inventory_view/components/ml/anomaly_detection/anomaly_detection_flyout';
import { WaffleFiltersProvider } from './inventory_view/hooks/use_waffle_filters';
import { WaffleOptionsProvider } from './inventory_view/hooks/use_waffle_options';
import { WaffleTimeProvider } from './inventory_view/hooks/use_waffle_time';
import { MetricsExplorerPage } from './metrics_explorer';
import {
  DEFAULT_METRICS_EXPLORER_VIEW_STATE,
  MetricsExplorerOptionsContainer,
} from './metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricDetail } from './metric_detail';
import { MetricsSettingsPage } from './settings';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

export const InfrastructurePage = ({ match }: RouteComponentProps) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const { setHeaderActionMenu } = useContext(HeaderActionMenuContext);

  const settingsTabTitle = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
    defaultMessage: 'Settings',
  });

  const kibana = useKibana();

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  return (
    <EuiErrorBoundary>
      <Source.Provider sourceId="default">
        <AlertPrefillProvider>
          <WaffleOptionsProvider>
            <WaffleTimeProvider>
              <WaffleFiltersProvider>
                <InfraMLCapabilitiesProvider>
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

                  {setHeaderActionMenu && (
                    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu}>
                      <EuiHeaderLinks gutterSize="xs">
                        <EuiHeaderLink color={'text'} {...settingsLinkProps}>
                          {settingsTabTitle}
                        </EuiHeaderLink>
                        <Route path={'/inventory'} component={AnomalyDetectionFlyout} />
                        <MetricsAlertDropdown />
                        <EuiHeaderLink
                          href={kibana.services?.application?.getUrlForApp(
                            '/home#/tutorial_directory/metrics'
                          )}
                          color="primary"
                          iconType="indexOpen"
                        >
                          {ADD_DATA_LABEL}
                        </EuiHeaderLink>
                      </EuiHeaderLinks>
                    </HeaderMenuPortal>
                  )}
                  <Switch>
                    <Route path={'/inventory'} component={SnapshotPage} />
                    <Route
                      path={'/explorer'}
                      render={(props) => (
                        <WithSource>
                          {({ configuration, createDerivedIndexPattern }) => (
                            <MetricsExplorerOptionsContainer.Provider>
                              <WithMetricsExplorerOptionsUrlState />
                              {configuration ? (
                                <PageContent
                                  configuration={configuration}
                                  createDerivedIndexPattern={createDerivedIndexPattern}
                                />
                              ) : (
                                <SourceLoadingPage />
                              )}
                            </MetricsExplorerOptionsContainer.Provider>
                          )}
                        </WithSource>
                      )}
                    />
                    <Route path="/detail/:type/:node" component={MetricDetail} />
                    <Route path={'/settings'} component={MetricsSettingsPage} />
                  </Switch>
                </InfraMLCapabilitiesProvider>
              </WaffleFiltersProvider>
            </WaffleTimeProvider>
          </WaffleOptionsProvider>
        </AlertPrefillProvider>
      </Source.Provider>
    </EuiErrorBoundary>
  );
};

const PageContent = (props: {
  configuration: MetricsSourceConfigurationProperties;
  createDerivedIndexPattern: (type: 'metrics') => IIndexPattern;
}) => {
  const { createDerivedIndexPattern, configuration } = props;
  const { options } = useContext(MetricsExplorerOptionsContainer.Context);

  return (
    <SavedViewProvider
      shouldLoadDefault={options.source === 'default'}
      viewType={'metrics-explorer-view'}
      defaultViewState={DEFAULT_METRICS_EXPLORER_VIEW_STATE}
    >
      <MetricsExplorerPage
        derivedIndexPattern={createDerivedIndexPattern('metrics')}
        source={configuration}
        {...props}
      />
    </SavedViewProvider>
  );
};
