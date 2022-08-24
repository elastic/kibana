/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiErrorBoundary, EuiHeaderLink, EuiHeaderLinks } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal, useLinkProps } from '@kbn/observability-plugin/public';
import React, { useContext } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';
import { MetricsSourceConfigurationProperties } from '../../../common/metrics_sources';
import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { SourceProvider } from '../../containers/metrics_source';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { SavedViewProvider } from '../../containers/saved_view/saved_view';
import { WithSource } from '../../containers/with_source';
import { useDerivedDataView } from '../../hooks/use_derived_data_view';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { HostsPage } from './hosts';
import { SnapshotPage } from './inventory_view';
import { AnomalyDetectionFlyout } from './inventory_view/components/ml/anomaly_detection/anomaly_detection_flyout';
import { WaffleFiltersProvider } from './inventory_view/hooks/use_waffle_filters';
import { WaffleOptionsProvider } from './inventory_view/hooks/use_waffle_options';
import { WaffleTimeProvider } from './inventory_view/hooks/use_waffle_time';
import { MetricsExplorerPage } from './metrics_explorer';
import {
  DEFAULT_METRICS_EXPLORER_VIEW_STATE,
  MetricsExplorerOptionsContainer,
  useMetricsExplorerOptionsContainerContext,
} from './metrics_explorer/hooks/use_metrics_explorer_options';
import { MetricDetail } from './metric_detail';
import { MetricsSettingsPage } from './settings';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

export const InfrastructurePage = ({ match }: RouteComponentProps) => {
  const uiCapabilities = useKibana().services.application?.capabilities;
  const { setHeaderActionMenu, theme$ } = useContext(HeaderActionMenuContext);

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
      <SourceProvider sourceId="default">
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

                  {setHeaderActionMenu && theme$ && (
                    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
                      <EuiHeaderLinks gutterSize="xs">
                        <EuiHeaderLink color={'text'} {...settingsLinkProps}>
                          {settingsTabTitle}
                        </EuiHeaderLink>
                        <Route path={'/inventory'} component={AnomalyDetectionFlyout} />
                        <MetricsAlertDropdown />
                        <EuiHeaderLink
                          href={kibana.services?.application?.getUrlForApp('/integrations/browse')}
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
                      render={() => (
                        <WithSource>
                          {({ configuration }) => (
                            <MetricsExplorerOptionsContainer>
                              <WithMetricsExplorerOptionsUrlState />
                              {configuration ? (
                                <PageContent configuration={configuration} />
                              ) : (
                                <SourceLoadingPage />
                              )}
                            </MetricsExplorerOptionsContainer>
                          )}
                        </WithSource>
                      )}
                    />
                    <Route path="/detail/:type/:node" component={MetricDetail} />
                    <Route path={'/hosts'} component={HostsPage} />
                    <Route path={'/settings'} component={MetricsSettingsPage} />
                  </Switch>
                </InfraMLCapabilitiesProvider>
              </WaffleFiltersProvider>
            </WaffleTimeProvider>
          </WaffleOptionsProvider>
        </AlertPrefillProvider>
      </SourceProvider>
    </EuiErrorBoundary>
  );
};

const PageContent = (props: { configuration: MetricsSourceConfigurationProperties }) => {
  const { configuration } = props;
  const { options } = useMetricsExplorerOptionsContainerContext();
  const derivedDataView = useDerivedDataView(configuration.metricAlias);

  return (
    <SavedViewProvider
      shouldLoadDefault={options.source === 'default'}
      viewType={'metrics-explorer-view'}
      defaultViewState={DEFAULT_METRICS_EXPLORER_VIEW_STATE}
    >
      <MetricsExplorerPage
        derivedIndexPattern={derivedDataView}
        source={configuration}
        {...props}
      />
    </SavedViewProvider>
  );
};
