import React, { useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem, type EuiAccordionProps } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { usePluginConfig } from '../../../../containers/plugin_config_context';
import { LinkToAlertsRule } from '../../links/link_to_alerts';
import { LinkToAlertsPage } from '../../links/link_to_alerts_page';
import { AlertFlyout } from '../../../../alerting/inventory/components/alert_flyout';
import { useBoolean } from '../../../../hooks/use_boolean';
import { AlertsSectionTitle } from '../../components/section_titles';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { CollapsibleSection } from './section/collapsible_section';
import { AlertsClosedContent } from './alerts_closed_content';
import { type AlertsCount } from '../../../../hooks/use_alerts_count';
import { createAlertsEsQuery } from '../../../../utils/filters/create_alerts_es_query';
import { ALERT_STATUS_ALL } from '../../../shared/alerts/constants';
import { AlertsOverview } from '../../../shared/alerts/alerts_overview';

export const AlertsSummaryContent = ({
  assetName,
  assetType,
  dateRange,
}: {
  assetName: string;
  assetType: InventoryItemType;
  dateRange: TimeRange;
}) => {
  const { featureFlags } = usePluginConfig();
  const [isAlertFlyoutVisible, { toggle: toggleAlertFlyout }] = useBoolean(false);
  const { overrides } = useAssetDetailsRenderPropsContext();
  const [collapsibleStatus, setCollapsibleStatus] =
    useState<EuiAccordionProps['forceState']>('open');
  const [activeAlertsCount, setActiveAlertsCount] = useState<number | undefined>(undefined);

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        hostNodeNames: [assetName],
        status: ALERT_STATUS_ALL,
      }),
    [assetName, dateRange]
  );

  const onLoaded = (alertsCount?: AlertsCount) => {
    const { activeAlertCount = 0 } = alertsCount ?? {};
    const hasActiveAlerts = activeAlertCount > 0;

    setCollapsibleStatus(hasActiveAlerts ? 'open' : 'closed');
    setActiveAlertsCount(alertsCount?.activeAlertCount);
  };

  return (
    <>
      <CollapsibleSection
        title={AlertsSectionTitle}
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
                assetName={assetName}
                queryField={`${assetType}.name`}
                dateRange={dateRange}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <AlertsOverview
          onLoaded={onLoaded}
          alertsQuery={alertsEsQueryByStatus}
          dateRange={dateRange}
        />
      </CollapsibleSection>
      {featureFlags.inventoryThresholdAlertRuleEnabled && (
        <AlertFlyout
          filter={`${findInventoryFields(assetType).name}: "${assetName}"`}
          nodeType={assetType}
          setVisible={toggleAlertFlyout}
          visible={isAlertFlyoutVisible}
          options={overrides?.alertRule?.options}
        />
      )}
    </>
  );
};
