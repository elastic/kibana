/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  Chart,
  isMetricElementEvent,
  LEGACY_DARK_THEME,
  Metric,
  MetricTrendShape,
  Settings,
} from '@elastic/charts';
import { EuiIcon, EuiPanel, useEuiBackgroundColor } from '@elastic/eui';
import { ALL_VALUE, HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { SloCardBadgesPortal } from './badges_portal';
import { useSloListActions } from '../../hooks/use_slo_list_actions';
import { BurnRateRuleFlyout } from '../common/burn_rate_rule_flyout';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { useKibana } from '../../../../utils/kibana_react';
import { useSloFormattedSummary } from '../../hooks/use_slo_summary';
import { SloCardItemActions } from './slo_card_item_actions';
import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloCardItemBadges } from './slo_card_item_badges';
const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);
export interface Props {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
  loading: boolean;
  error: boolean;
  cardsPerRow: number;
}

export const useSloCardColor = (status?: SLOWithSummaryResponse['summary']['status']) => {
  const colors = {
    DEGRADING: useEuiBackgroundColor('warning'),
    VIOLATED: useEuiBackgroundColor('danger'),
    HEALTHY: useEuiBackgroundColor('success'),
    NO_DATA: useEuiBackgroundColor('subdued'),
  };

  return { cardColor: colors[status ?? 'NO_DATA'], colors };
};

export const getSubTitle = (slo: SLOWithSummaryResponse) => {
  return slo.groupBy && slo.groupBy !== ALL_VALUE ? `${slo.groupBy}: ${slo.instanceId}` : '';
};

export function SloCardItem({ slo, rules, activeAlerts, historicalSummary, cardsPerRow }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);
  const [isDashboardAttachmentReady, setDashboardAttachmentReady] = useState(false);
  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  const { handleCreateRule, handleDeleteCancel, handleDeleteConfirm, handleAttachToDashboardSave } =
    useSloListActions({
      slo,
      setDeleteConfirmationModalOpen,
      setIsActionsPopoverOpen,
      setIsAddRuleFlyoutOpen,
      setDashboardAttachmentReady,
    });

  return (
    <>
      <EuiPanel
        panelRef={containerRef as React.Ref<HTMLDivElement>}
        onMouseOver={() => {
          if (!isMouseOver) {
            setIsMouseOver(true);
          }
        }}
        onMouseLeave={() => {
          if (isMouseOver) {
            setIsMouseOver(false);
          }
        }}
        paddingSize="none"
        css={css`
          height: 182px;
          overflow: hidden;
          position: relative;
        `}
        title={slo.summary.status}
      >
        <SloCardChart slo={slo} historicalSliData={historicalSliData} />
        {(isMouseOver || isActionsPopoverOpen) && (
          <SloCardItemActions
            slo={slo}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setDeleteConfirmationModalOpen={setDeleteConfirmationModalOpen}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />
        )}
      </EuiPanel>
      <SloCardBadgesPortal containerRef={containerRef}>
        <SloCardItemBadges
          slo={slo}
          rules={rules}
          activeAlerts={activeAlerts}
          handleCreateRule={handleCreateRule}
          hasGroupBy={Boolean(slo.groupBy && slo.groupBy !== ALL_VALUE)}
        />
      </SloCardBadgesPortal>

      <BurnRateRuleFlyout
        slo={slo}
        isAddRuleFlyoutOpen={isAddRuleFlyoutOpen}
        setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
      />

      {isDeleteConfirmationModalOpen ? (
        <SloDeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
      {isDashboardAttachmentReady ? (
        <SavedObjectSaveModalDashboard
          objectType={i18n.translate(
            'xpack.observability.slo.item.actions.attachToDashboard.objectTypeLabel',
            { defaultMessage: 'SLO Overview' }
          )}
          documentInfo={{
            title: i18n.translate(
              'xpack.observability.slo.item.actions.attachToDashboard.attachmentTitle',
              { defaultMessage: 'SLO Overview' }
            ),
          }}
          canSaveByReference={false}
          onClose={() => {
            setDashboardAttachmentReady(false);
          }}
          onSave={handleAttachToDashboardSave}
        />
      ) : null}
    </>
  );
}

export function SloCardChart({
  slo,
  onClick,
  historicalSliData,
}: {
  slo: SLOWithSummaryResponse;
  historicalSliData?: Array<{ key?: number; value?: number }>;
  onClick?: () => void;
}) {
  const {
    application: { navigateToUrl },
  } = useKibana().services;

  const { cardColor } = useSloCardColor(slo.summary.status);
  const subTitle = getSubTitle(slo);
  const { sliValue, sloTarget, sloDetailsUrl } = useSloFormattedSummary(slo);

  return (
    <Chart>
      <Settings
        // TODO connect to charts.theme service see src/plugins/charts/public/services/theme/README.md
        baseTheme={LEGACY_DARK_THEME}
        onElementClick={([d]) => {
          if (onClick) {
            onClick();
          } else {
            if (isMetricElementEvent(d)) {
              navigateToUrl(sloDetailsUrl);
            }
          }
        }}
        locale={i18n.getLocale()}
      />
      <Metric
        id={`${slo.id}-${slo.instanceId}`}
        data={[
          [
            {
              title: slo.name,
              subtitle: subTitle,
              value: sliValue,
              trendShape: MetricTrendShape.Area,
              trend: historicalSliData?.map((d) => ({
                x: d.key as number,
                y: d.value as number,
              })),
              extra: (
                <FormattedMessage
                  id="xpack.observability.sLOGridItem.targetFlexItemLabel"
                  defaultMessage="Target {target}"
                  values={{
                    target: sloTarget,
                  }}
                />
              ),
              icon: () => <EuiIcon type="visGauge" size="l" />,
              color: cardColor,
            },
          ],
        ]}
      />
    </Chart>
  );
}
