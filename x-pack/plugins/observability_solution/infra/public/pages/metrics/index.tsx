/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import React, { useContext } from 'react';
import { Routes, Route } from '@kbn/shared-ux-router';

import {
  EuiErrorBoundary,
  EuiHeaderLinks,
  EuiHeaderLink,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { useKibana, useUiSetting } from '@kbn/kibana-react-plugin/public';
import { HeaderMenuPortal, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { enableInfrastructureHostsView } from '@kbn/observability-plugin/common';
import { SharePublicStart } from '@kbn/share-plugin/public/plugin';
import {
  ObservabilityOnboardingLocatorParams,
  OBSERVABILITY_ONBOARDING_LOCATOR,
} from '@kbn/deeplinks-observability';
import { HelpCenterContent } from '../../components/help_center_content';
import { useReadOnlyBadge } from '../../hooks/use_readonly_badge';
import { MetricsExplorerPage } from './metrics_explorer';
import { SnapshotPage } from './inventory_view';
import { NodeDetail } from './metric_detail';
import { MetricsSettingsPage } from './settings';
import { MetricsAlertDropdown } from '../../alerting/common/components/metrics_alert_dropdown';
import { AlertPrefillProvider } from '../../alerting/use_alert_prefill';
import { InfraMLCapabilitiesProvider } from '../../containers/ml/infra_ml_capabilities';
import { AnomalyDetectionFlyout } from '../../components/ml/anomaly_detection/anomaly_detection_flyout';
import { HeaderActionMenuContext } from '../../utils/header_action_menu_provider';
import { NotFoundPage } from '../404';
import { ReactQueryProvider } from '../../containers/react_query_provider';
import { usePluginConfig } from '../../containers/plugin_config_context';
import { HostsPage } from './hosts';
import { RedirectWithQueryParams } from '../../utils/redirect_with_query_params';

const ADD_DATA_LABEL = i18n.translate('xpack.infra.metricsHeaderAddDataButtonLabel', {
  defaultMessage: 'Add data',
});

export const InfrastructurePage = () => {
  const config = usePluginConfig();
  const { application, share } = useKibana<{ share: SharePublicStart }>().services;
  const { setHeaderActionMenu, theme$ } = useContext(HeaderActionMenuContext);
  const isHostsViewEnabled = useUiSetting(enableInfrastructureHostsView);

  const uiCapabilities = application?.capabilities;
  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );

  const settingsTabTitle = i18n.translate('xpack.infra.metrics.settingsTabTitle', {
    defaultMessage: 'Settings',
  });

  useReadOnlyBadge(!uiCapabilities?.infrastructure?.save);

  const settingsLinkProps = useLinkProps({
    app: 'metrics',
    pathname: 'settings',
  });

  return (
    <EuiErrorBoundary>
      <ReactQueryProvider>
        <AlertPrefillProvider>
          <InfraMLCapabilitiesProvider>
            <HelpCenterContent
              feedbackLink="https://discuss.elastic.co/c/metrics"
              appName={i18n.translate('xpack.infra.header.infrastructureHelpAppName', {
                defaultMessage: 'Metrics',
              })}
            />
            {setHeaderActionMenu && theme$ && (
              <HeaderMenuPortal setHeaderActionMenu={setHeaderActionMenu} theme$={theme$}>
                <EuiFlexGroup responsive={false} gutterSize="s">
                  <EuiFlexItem>
                    <EuiHeaderLinks gutterSize="xs">
                      <EuiHeaderLink color={'text'} {...settingsLinkProps}>
                        {settingsTabTitle}
                      </EuiHeaderLink>
                      <Route path="/inventory" component={AnomalyDetectionFlyout} />
                      <Route
                        path="/hosts"
                        render={() => <AnomalyDetectionFlyout hideJobType hideSelectGroup />}
                      />
                      <Route
                        path="/detail/host"
                        render={() => <AnomalyDetectionFlyout hideJobType hideSelectGroup />}
                      />
                      {config.featureFlags.alertsAndRulesDropdownEnabled && (
                        <MetricsAlertDropdown />
                      )}
                      <EuiHeaderLink
                        href={onboardingLocator?.useUrl({ category: 'infra' })}
                        color="primary"
                        iconType="indexOpen"
                      >
                        {ADD_DATA_LABEL}
                      </EuiHeaderLink>
                    </EuiHeaderLinks>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </HeaderMenuPortal>
            )}

            <Routes>
              <Route path="/inventory" component={SnapshotPage} />
              {config.featureFlags.metricsExplorerEnabled && (
                <Route path="/explorer" component={MetricsExplorerPage} />
              )}
              <Route path="/detail/:type/:node" component={NodeDetail} />
              {isHostsViewEnabled && <Route path="/hosts" component={HostsPage} />}
              <Route path="/settings" component={MetricsSettingsPage} />

              <RedirectWithQueryParams from="/snapshot" exact to="/inventory" />
              <RedirectWithQueryParams from="/metrics-explorer" exact to="/explorer" />
              <RedirectWithQueryParams from="/" exact to="/inventory" />

              <Route
                render={() => (
                  <NotFoundPage
                    title={i18n.translate('xpack.infra.header.infrastructureLabel', {
                      defaultMessage: 'Infrastructure',
                    })}
                  />
                )}
              />
            </Routes>
          </InfraMLCapabilitiesProvider>
        </AlertPrefillProvider>
      </ReactQueryProvider>
    </EuiErrorBoundary>
  );
};
