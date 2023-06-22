/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useContext } from 'react';
import { RouteComponentProps, Switch } from 'react-router-dom';
import { Route } from '@kbn/shared-ux-router';

import { EuiErrorBoundary, EuiHeaderLinks, EuiHeaderLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { MetricsSourceConfigurationProperties } from '../../../common/metrics_sources';
import { HelpCenterContent } from '../../components/help_center_content';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { MetricsExplorerOptionsContainer } from './metrics_explorer/hooks/use_metrics_explorer_options';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './inventory_view';
import { MetricDetail } from './metric_detail';
import { MetricsSettingsPage } from './settings';
import { HostsLandingPage } from './hosts/hosts_landing_page';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { WaffleOptionsProvider } from './inventory_view/hooks/use_waffle_options';
import { WaffleTimeProvider } from './inventory_view/hooks/use_waffle_time';
import { WaffleFiltersProvider } from './inventory_view/hooks/use_waffle_filters';
import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { AnomalyDetectionFlyout } from './inventory_view/components/ml/anomaly_detection/anomaly_detection_flyout';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { CreateDerivedIndexPattern, useSourceContext } from '../../containers/metrics_source';
import { NotFoundPage } from '../404';
import { ReactQueryProvider } from '../../containers/react_query_provider';

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

  const { source, createDerivedIndexPattern } = useSourceContext();

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  return (
    <EuiErrorBoundary>
      <AlertPrefillProvider>
        <WaffleOptionsProvider>
          <WaffleTimeProvider>
            <WaffleFiltersProvider>
              <ReactQueryProvider>
                <InfraMLCapabilitiesProvider>
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
                    <Route path={'/explorer'}>
                      <MetricsExplorerOptionsContainer>
                        <WithMetricsExplorerOptionsUrlState />
                        {source?.configuration ? (
                          <PageContent
                            configuration={source.configuration}
                            createDerivedIndexPattern={createDerivedIndexPattern}
                          />
                        ) : (
                          <SourceLoadingPage />
                        )}
                      </MetricsExplorerOptionsContainer>
                    </Route>
                    <Route path="/detail/:type/:node" component={MetricDetail} />
                    <Route path={'/hosts'} component={HostsLandingPage} />
                    <Route path={'/settings'} component={MetricsSettingsPage} />
                    <Route render={() => <NotFoundPage title="Infrastructure" />} />
                  </Switch>
                </InfraMLCapabilitiesProvider>
              </ReactQueryProvider>
            </WaffleFiltersProvider>
          </WaffleTimeProvider>
        </WaffleOptionsProvider>
      </AlertPrefillProvider>
    </EuiErrorBoundary>
  );
};

const PageContent = (props: {
  configuration: MetricsSourceConfigurationProperties;
  createDerivedIndexPattern: CreateDerivedIndexPattern;
}) => {
  const { createDerivedIndexPattern, configuration } = props;

  return (
    <MetricsExplorerPage
      derivedIndexPattern={createDerivedIndexPattern()}
      source={configuration}
      {...props}
    />
  );
};
