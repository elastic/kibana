/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTab,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { ComponentType } from 'react';
import { $ElementType } from 'utility-types';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';
import { getAlertingCapabilities } from '../../alerting/get_alert_capabilities';
import { ApmHeader } from '../../shared/ApmHeader';
import { AnomalyDetectionSetupLink } from '../../shared/Links/apm/AnomalyDetectionSetupLink';
import { useServiceMapHref } from '../../shared/Links/apm/ServiceMapLink';
import { useServiceInventoryHref } from '../../shared/Links/apm/service_inventory_link';
import { SettingsLink } from '../../shared/Links/apm/SettingsLink';
import { useTraceOverviewHref } from '../../shared/Links/apm/TraceOverviewLink';
import { SetupInstructionsLink } from '../../shared/Links/SetupInstructionsLink';
import { MainTabs } from '../../shared/main_tabs';
import { ServiceMap } from '../ServiceMap';
import { ServiceInventory } from '../service_inventory';
import { TraceOverview } from '../TraceOverview';
import { AlertingPopoverAndFlyout } from './alerting_popover_flyout';

interface Tab {
  key: string;
  href: string;
  text: string;
  Component: ComponentType;
}

const SETTINGS_LINK_LABEL = i18n.translate('xpack.apm.settingsLinkLabel', {
  defaultMessage: 'Settings',
});

interface Props {
  tab: 'traces' | 'services' | 'service-map';
}

export function Home({ tab }: Props) {
  const { core, plugins } = useApmPluginContext();

  const homeTabs: Tab[] = [
    {
      key: 'services',
      href: useServiceInventoryHref(),
      text: i18n.translate('xpack.apm.home.servicesTabLabel', {
        defaultMessage: 'Services',
      }),
      Component: ServiceInventory,
    },
    {
      key: 'traces',
      href: useTraceOverviewHref(),
      text: i18n.translate('xpack.apm.home.tracesTabLabel', {
        defaultMessage: 'Traces',
      }),
      Component: TraceOverview,
    },
    {
      key: 'service-map',
      href: useServiceMapHref(),
      text: i18n.translate('xpack.apm.home.serviceMapTabLabel', {
        defaultMessage: 'Service Map',
      }),
      Component: ServiceMap,
    },
  ];
  const capabilities = core.application.capabilities;
  const canAccessML = !!capabilities.ml?.canAccessML;
  const selectedTab = homeTabs.find(
    (homeTab) => homeTab.key === tab
  ) as $ElementType<typeof homeTabs, number>;

  const {
    isAlertingAvailable,
    canReadAlerts,
    canSaveAlerts,
    canReadAnomalies,
  } = getAlertingCapabilities(plugins, core.application.capabilities);

  return (
    <>
      <ApmHeader>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h1>APM</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <SettingsLink>
              <EuiButtonEmpty size="s" color="primary" iconType="gear">
                {SETTINGS_LINK_LABEL}
              </EuiButtonEmpty>
            </SettingsLink>
          </EuiFlexItem>
          {isAlertingAvailable && (
            <EuiFlexItem grow={false}>
              <AlertingPopoverAndFlyout
                canReadAlerts={canReadAlerts}
                canSaveAlerts={canSaveAlerts}
                canReadAnomalies={canReadAnomalies}
              />
            </EuiFlexItem>
          )}
          {canAccessML && (
            <EuiFlexItem grow={false}>
              <AnomalyDetectionSetupLink />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <SetupInstructionsLink />
          </EuiFlexItem>
        </EuiFlexGroup>
      </ApmHeader>
      <MainTabs>
        {homeTabs.map(({ href, key, text }) => (
          <EuiTab href={href} isSelected={key === selectedTab.key} key={key}>
            {text}
          </EuiTab>
        ))}
      </MainTabs>
      <selectedTab.Component />
    </>
  );
}
