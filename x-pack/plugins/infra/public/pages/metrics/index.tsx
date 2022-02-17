/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useContext } from 'react';
import { Route, RouteComponentProps, Switch } from 'react-router-dom';

import { EuiErrorBoundary, EuiHeaderLinks, EuiHeaderLink, EuiToolTip } from '@elastic/eui';
import { MetricsSourceConfigurationProperties } from '../../../common/metrics_sources';
import { DocumentTitle } from '../../components/document_title';
import { HelpCenterContent } from '../../components/help_center_content';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import {
  MetricsExplorerOptionsContainer,
  DEFAULT_METRICS_EXPLORER_VIEW_STATE,
} from './metrics_explorer/hooks/use_metrics_explorer_options';
import { WithMetricsExplorerOptionsUrlState } from '../../containers/metrics_explorer/with_metrics_explorer_options_url_state';
import { WithSource } from '../../containers/with_source';
import { Source } from '../../containers/metrics_source';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './inventory_view';
import { MetricDetail } from './metric_detail';
import { MetricsSettingsPage } from './settings';
import { SourceLoadingPage } from '../../components/source_loading_page';
import { RedirectAppLinks, useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { WaffleOptionsProvider } from './inventory_view/hooks/use_waffle_options';
import { WaffleTimeProvider } from './inventory_view/hooks/use_waffle_time';
import { WaffleFiltersProvider } from './inventory_view/hooks/use_waffle_filters';

import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { SavedViewProvider } from '../../containers/saved_view/saved_view';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { AnomalyDetectionFlyout } from './inventory_view/components/ml/anomaly_detection/anomaly_detection_flyout';
import { createExploratoryViewUrl, HeaderMenuPortal } from '../../../../observability/public';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { useLinkProps } from '../../../../observability/public';
import { CreateDerivedIndexPattern } from '../../containers/metrics_source';

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

  const metricsExploratoryViewLink = createExploratoryViewUrl(
    {
      reportType: 'kpi-over-time',
      allSeries: [
        {
          dataType: 'infra_metrics',
          seriesType: 'area',
          time: { to: 'now', from: 'now-15m' },
          reportDefinitions: {
            'agent.hostname': ['ALL_VALUES'],
          },
          selectedMetricField: 'system.cpu.total.norm.pct',
          name: 'Metrics-series',
        },
      ],
    },
    kibana.services.http?.basePath.get()
  );

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

                  {setHeaderActionMenu && theme$ && (
                    <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
                      <EuiHeaderLinks gutterSize="xs">
                        <EuiToolTip position="top" content={<p>{EXPLORE_MESSAGE}</p>}>
                          <RedirectAppLinks application={kibana.services.application!}>
                            <EuiHeaderLink
                              aria-label={i18n.translate(
                                'xpack.infra.metrics.pageHeader.analyzeData.label',
                                {
                                  defaultMessage:
                                    'Navigate to the "Explore Data" view to visualize infra metrics data',
                                }
                              )}
                              href={metricsExploratoryViewLink}
                              color="text"
                              iconType="visBarVerticalStacked"
                            >
                              {EXPLORE_DATA}
                            </EuiHeaderLink>
                          </RedirectAppLinks>
                        </EuiToolTip>
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
  createDerivedIndexPattern: CreateDerivedIndexPattern;
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
        derivedIndexPattern={createDerivedIndexPattern()}
        source={configuration}
        {...props}
      />
    </SavedViewProvider>
  );
};

const EXPLORE_DATA = i18n.translate('xpack.infra.metrics.exploreDataButtonLabel', {
  defaultMessage: 'Explore data',
});

const EXPLORE_MESSAGE = i18n.translate('xpack.infra.metrics.exploreDataButtonLabel.message', {
  defaultMessage:
    'Explore Data allows you to select and filter result data in any dimension and look for the cause or impact of performance problems.',
});
