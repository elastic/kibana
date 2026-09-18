/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppMenuConfig, AppMenuItemType } from '@kbn/core-chrome-app-menu-components';
import type { ObservabilityOnboardingLocatorParams } from '@kbn/deeplinks-observability';
import { OBSERVABILITY_ONBOARDING_LOCATOR } from '@kbn/deeplinks-observability';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { enableInspectEsQueries } from '@kbn/observability-plugin/public';
import { useInspectorContext } from '@kbn/observability-shared-plugin/public';
import type { ApmRuleType } from '@kbn/rule-data-utils';
import { ALL_VALUE } from '@kbn/slo-schema';
import React, { useCallback, useMemo, useState } from 'react';
import { ENVIRONMENT_ALL } from '../../../../../common/environment_filter_values';
import type { ApmIndicatorType } from '../../../../../common/slo_indicator_types';
import { APM_SLO_INDICATOR_TYPES } from '../../../../../common/slo_indicator_types';
import { useAnomalyDetectionJobsContext } from '../../../../context/anomaly_detection_jobs/use_anomaly_detection_jobs_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useEnvironmentsContext } from '../../../../context/environments_context/use_environments_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { useManageSlosUrl } from '../../../../hooks/use_manage_slos_url';
import { useServiceName } from '../../../../hooks/use_service_name';
import type { ApmPluginStartDeps } from '../../../../plugin';
import { getAlertingCapabilities } from '../../../alerting/utils/get_alerting_capabilities';
import { AlertingFlyout } from '../../../alerting/ui_components/alerting_flyout';
import { getLegacyApmHref } from '../../../shared/links/apm/apm_link_hooks';
import { getAddDataMenuItem } from './add_data_menu_item';
import { getAlertingMenuItem } from './alerting_menu_item';
import { ApmAppMenuProvider } from './apm_app_menu_context';
import { getAnomalyDetectionMenuItem } from './anomaly_detection_menu_item';
import { getInspectorMenuItem } from './inspector_menu_item';
import { getSettingsMenuItem } from './settings_menu_item';
import { getSloMenuItem } from './slo_menu_item';
import { getStorageExplorerMenuItem } from './storage_explorer_menu_item';

/**
 * Builds the global APM app menu (kibana-team#3549 / #282982) and hosts alert/SLO flyouts.
 * Inline AppHeader pages read the config via context; legacy ApmMainTemplate routes register
 * it with chrome.setAppMenu so ClassicHeader / Chrome Next fallback can render it once.
 */
export function ApmAppMenu({ children }: { children?: React.ReactNode }) {
  const { core, plugins, config, share, inspector } = useApmPluginContext();
  const { search } = window.location;
  const { application, http } = core;
  const { basePath } = http;
  const { capabilities } = application;
  const { featureFlags } = config;
  const {
    services: { uiSettings, slo },
  } = useKibana<ApmPluginStartDeps>();

  const canCreateMlJobs = !!capabilities.ml?.canCreateJob;
  const canReadMlJobs = !!capabilities.ml?.canGetJobs;
  const { isAlertingAvailable, canReadAlerts, canSaveAlerts } = getAlertingCapabilities(
    plugins,
    capabilities
  );
  const canSaveApmAlerts = capabilities.apm.save && canSaveAlerts;
  const canReadSlos = !!capabilities.slo?.read;
  const canWriteSlos = !!capabilities.slo?.write;

  const onboardingLocator = share?.url.locators.get<ObservabilityOnboardingLocatorParams>(
    OBSERVABILITY_ONBOARDING_LOCATOR
  );
  const addDataUrl = onboardingLocator?.useUrl({ category: 'application' }) ?? '';

  const { preferredEnvironment } = useEnvironmentsContext();
  const { anomalyDetectionSetupState } = useAnomalyDetectionJobsContext();
  const { inspectorAdapters } = useInspectorContext();
  const isInspectorEnabled = uiSettings?.get<boolean>(enableInspectEsQueries) ?? false;

  const manageRulesHref = plugins.observability.useRulesLink().href;
  const manageSlosUrl = useManageSlosUrl();
  const serviceName = useServiceName();
  const { query } = useApmParams('/*');
  const apmEnvironment = ('environment' in query && query.environment) || ENVIRONMENT_ALL.value;
  const sloEnvironment = apmEnvironment === ENVIRONMENT_ALL.value ? ALL_VALUE : apmEnvironment;

  const [ruleType, setRuleType] = useState<ApmRuleType | null>(null);
  const [sloFlyout, setSloFlyout] = useState<{
    isOpen: boolean;
    indicatorType: ApmIndicatorType | null;
  }>({ isOpen: false, indicatorType: null });

  const openSloFlyout = useCallback((indicatorType: ApmIndicatorType) => {
    setSloFlyout({ isOpen: true, indicatorType });
  }, []);

  const closeSloFlyout = useCallback(() => {
    setSloFlyout({ isOpen: false, indicatorType: null });
  }, []);

  const apmHref = useCallback(
    (path: string) => getLegacyApmHref({ basePath, path, search }),
    [basePath, search]
  );

  const menu = useMemo<AppMenuConfig>(() => {
    const items: AppMenuItemType[] = [];
    let order = 0;

    const pushItem = (item: AppMenuItemType | undefined) => {
      if (item) {
        items.push(item);
      }
    };

    // Inline (limit 2 when More is present): Alerts, SLOs. Everything else uses overflow: true.
    pushItem(
      getAlertingMenuItem({
        isAlertingAvailable,
        canSaveApmAlerts,
        canReadAlerts,
        canReadMlJobs,
        manageRulesHref,
        onCreateRule: setRuleType,
        order: order++,
      })
    );
    pushItem(
      getSloMenuItem({
        canReadSlos,
        canWriteSlos,
        manageSlosUrl,
        onCreateSlo: openSloFlyout,
        order: order++,
      })
    );
    pushItem(
      getAnomalyDetectionMenuItem({
        canCreateMlJobs,
        anomalyDetectionSetupState,
        preferredEnvironment,
        href: apmHref('/settings/anomaly-detection'),
        order: order++,
      })
    );
    pushItem(
      getStorageExplorerMenuItem({
        isAvailable: featureFlags.storageExplorerAvailable,
        href: apmHref('/storage-explorer'),
        order: order++,
      })
    );
    pushItem(
      getSettingsMenuItem({
        href: apmHref('/settings'),
        order: order++,
      })
    );
    pushItem(
      getInspectorMenuItem({
        isEnabled: isInspectorEnabled,
        onInspect: () => {
          inspector.open(inspectorAdapters);
        },
        order: order++,
      })
    );

    return {
      items,
      primaryActionItem: getAddDataMenuItem({
        href: addDataUrl,
      }),
    };
  }, [
    addDataUrl,
    anomalyDetectionSetupState,
    apmHref,
    canCreateMlJobs,
    canReadAlerts,
    canReadMlJobs,
    canReadSlos,
    canSaveApmAlerts,
    canWriteSlos,
    featureFlags.storageExplorerAvailable,
    inspector,
    inspectorAdapters,
    isAlertingAvailable,
    isInspectorEnabled,
    manageRulesHref,
    manageSlosUrl,
    openSloFlyout,
    preferredEnvironment,
  ]);

  const createSloFlyoutElement =
    sloFlyout.isOpen && sloFlyout.indicatorType
      ? slo?.getCreateSLOFormFlyout({
          initialValues: {
            ...(serviceName && { name: `APM SLO for ${serviceName}` }),
            indicator: {
              type: sloFlyout.indicatorType,
              params: {
                ...(serviceName && { service: serviceName }),
                environment: sloEnvironment,
              },
            },
          },
          onClose: closeSloFlyout,
          formSettings: {
            allowedIndicatorTypes: [...APM_SLO_INDICATOR_TYPES],
          },
        })
      : null;

  return (
    <ApmAppMenuProvider config={menu}>
      <AlertingFlyout
        ruleType={ruleType}
        addFlyoutVisible={!!ruleType}
        setAddFlyoutVisibility={(visible) => {
          if (!visible) {
            setRuleType(null);
          }
        }}
      />
      {createSloFlyoutElement}
      {children}
    </ApmAppMenuProvider>
  );
}
