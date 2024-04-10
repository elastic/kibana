/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, type EuiAccordionProps } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { usePluginConfig } from '../../../../../containers/plugin_config_context';
import { LinkToAlertsRule } from '../../../links/link_to_alerts';
import { LinkToAlertsPage } from '../../../links/link_to_alerts_page';
import { AlertFlyout } from '../../../../../alerting/inventory/components/alert_flyout';
import { useBoolean } from '../../../../../hooks/use_boolean';
import { AlertsSectionTitle } from '../section_titles';
import { useAssetDetailsRenderPropsContext } from '../../../hooks/use_asset_details_render_props';
import { Section } from '../../../components/section';
import { AlertsClosedContent } from './alerts_closed_content';
import { type AlertsCount } from '../../../../../hooks/use_alerts_count';
import { AlertsOverview } from '../../../../shared/alerts/alerts_overview';

export const AlertsSummaryContent = ({
  assetId,
  assetType,
  dateRange,
}: {
  assetId: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}) => {
  const { featureFlags } = usePluginConfig();
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);
  const { overrides } = useAssetDetailsRenderPropsContext();
  const [collapsibleStatus, setCollapsibleStatus] =
    useState<EuiAccordionProps['forceState']>('open');
  const [activeAlertsCount, setActiveAlertsCount] = useState<number | undefined>(undefined);

  const onLoaded = (alertsCount?: AlertsCount) => {
    const { activeAlertCount = 0 } = alertsCount ?? {};
    const hasActiveAlerts = activeAlertCount > 0;

    setCollapsibleStatus(hasActiveAlerts ? 'open' : 'closed');
    setActiveAlertsCount(alertsCount?.activeAlertCount);
  };

  const assetFields = findInventoryFields(assetType);

  return (
    <>
      <Section
        title={<AlertsSectionTitle />}
        collapsible
        data-test-subj="infraAssetDetailsAlertsCollapsible"
        id="alerts"
        closedSectionContent={<AlertsClosedContent activeAlertCount={activeAlertsCount} />}
        initialTriggerValue={collapsibleStatus}
        extraAction={
          <EuiFlexGroup alignItems="center" responsive={false}>
            {featureFlags.inventoryThresholdAlertRuleEnabled && (
              <EuiFlexItem grow={false}>
                <LinkToAlertsRule onClick={toggleAlertFlyout} />
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <LinkToAlertsPage
                assetId={assetId}
                queryField={assetFields.id}
                dateRange={dateRange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <AlertsOverview onLoaded={onLoaded} dateRange={dateRange} assetId={assetId} />
      </Section>
      {featureFlags.inventoryThresholdAlertRuleEnabled && (
        <AlertFlyout
          filter={`${assetFields.id}: "${assetId}"`}
          nodeType={assetType}
          setVisible={toggleAlertFlyout}
          visible={isAlertFlyoutVisible}
          options={overrides?.alertRule?.options}
        />
      )}
    </>
  );
};
