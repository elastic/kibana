/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState } from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSummaryTimeRange } from '@kbn/observability-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { usePluginConfig } from '../../../../containers/plugin_config_context';
import type { AlertsEsQuery } from '../../../../common/alerts/types';
import { createAlertsEsQuery } from '../../../../common/alerts/create_alerts_es_query';
import { infraAlertFeatureIds } from '../../../../pages/metrics/hosts/components/tabs/config';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { LinkToAlertsRule } from '../../links/link_to_alerts';
import { LinkToAlertsPage } from '../../links/link_to_alerts_page';
import { AlertFlyout } from '../../../../alerting/inventory/components/alert_flyout';
import { useBoolean } from '../../../../hooks/use_boolean';
import { ALERT_STATUS_ALL } from '../../../../common/alerts/constants';
import { AlertsSectionTitle } from '../../components/section_titles';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { CollapsibleSection, type SectionTriggerValue } from './section/collapsible_section';
// import { AlertsClosedContent } from './alerts_closed_content';
import { useAlertsCount } from '../../../../hooks/use_alerts_count';

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
  const [isAlertSectionOpen, setIsAlertSectionOpen] = useState<SectionTriggerValue>('open');

  const alertsEsQueryByStatus = useMemo(
    () =>
      createAlertsEsQuery({
        dateRange,
        hostNodeNames: [assetName],
        status: ALERT_STATUS_ALL,
      }),
    [assetName, dateRange]
  );

  const ExtraActions = () => (
    <EuiFlexGroup alignItems="center" responsive={false}>
      {featureFlags.inventoryThresholdAlertRuleEnabled && (
        <EuiFlexItem grow={false}>
          <LinkToAlertsRule
            onClick={(e) => {
              e.stopPropagation();
              toggleAlertFlyout();
            }}
          />
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
  );

  return (
    <>
      <CollapsibleSection
        title={AlertsSectionTitle}
        shouldCollapse={true}
        data-test-subj="infraAssetDetailsAlertsCollapsible"
        id={'alerts'}
        extraAction={<ExtraActions />}
        closedSectionContent={
          isAlertSectionOpen === ('closed' as SectionTriggerValue) ? (
            <span data-test-subj="infraAssetDetailsAlertsClosedContentNoAlerts">
              {i18n.translate('xpack.infra.assetDetails.noActiveAlertsContentClosedSection', {
                defaultMessage: 'No active alerts',
              })}
            </span>
          ) : (
            <></>
          )
        }
        initialTriggerValue={isAlertSectionOpen}
      >
        <MemoAlertSummaryWidget
          setIsAlertSectionOpen={setIsAlertSectionOpen}
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

interface MemoAlertSummaryWidgetProps {
  alertsQuery: AlertsEsQuery;
  dateRange: TimeRange;
  setIsAlertSectionOpen: (value: SectionTriggerValue) => void;
}

const MemoAlertSummaryWidget = React.memo(
  ({ alertsQuery, dateRange, setIsAlertSectionOpen }: MemoAlertSummaryWidgetProps) => {
    const { services } = useKibanaContextForPlugin();

    const summaryTimeRange = useSummaryTimeRange(dateRange);

    const { charts, triggersActionsUi } = services;
    const { getAlertSummaryWidget: AlertSummaryWidget } = triggersActionsUi;

    const chartProps = {
      baseTheme: charts.theme.useChartsBaseTheme(),
    };

    const { alertsCount, loading, error } = useAlertsCount({
      featureIds: infraAlertFeatureIds,
      query: alertsQuery,
    });

    if (loading) {
      return <EuiLoadingSpinner />;
    }

    const hasActiveAlerts =
      typeof alertsCount?.activeAlertCount === 'number' && alertsCount?.activeAlertCount > 0;

    if (error) {
      return (
        <div>
          {i18n.translate('xpack.infra.assetDetails.activeAlertsContent.countError', {
            defaultMessage:
              'The active alert count was not retrieved correctly, try reloading the page.',
          })}
        </div>
      );
    }

    return (
      <AlertSummaryWidget
        chartProps={chartProps}
        featureIds={infraAlertFeatureIds}
        filter={alertsQuery}
        timeRange={summaryTimeRange}
        onLoaded={() => {
          setIsAlertSectionOpen(hasActiveAlerts ? 'open' : 'closed');
        }}
        fullSize
        hideChart
      />
    );
  }
);
