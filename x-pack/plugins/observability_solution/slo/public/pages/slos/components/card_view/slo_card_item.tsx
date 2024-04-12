/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  Chart,
  isMetricElementEvent,
  LEGACY_DARK_THEME,
  Metric,
  MetricTrendShape,
  Settings,
} from '@elastic/charts';
import { EuiIcon, EuiPanel, useEuiBackgroundColor } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { ALL_VALUE, HistoricalSummaryResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useState } from 'react';
import { EditBurnRateRuleFlyout } from '../common/edit_burn_rate_rule_flyout';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { BurnRateRuleParams } from '../../../../typings';
import { useKibana } from '../../../../utils/kibana_react';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { useSloListActions } from '../../hooks/use_slo_list_actions';
import { useSloFormattedSummary } from '../../hooks/use_slo_summary';
import { BurnRateRuleFlyout } from '../common/burn_rate_rule_flyout';
import { SloCardItemActions } from './slo_card_item_actions';
import { SloCardItemBadges } from './slo_card_item_badges';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);
export interface Props {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<BurnRateRuleParams>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
  loading: boolean;
  error: boolean;
  refetchRules: () => void;
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
  return getFirstGroupBy(slo);
};

const getFirstGroupBy = (slo: SLOWithSummaryResponse) => {
  const firstGroupBy = Object.entries(slo.groupings).map(([key, value]) => `${key}: ${value}`)[0];

  return slo.groupBy && ![slo.groupBy].flat().includes(ALL_VALUE) ? firstGroupBy : '';
};

export function SloCardItem({ slo, rules, activeAlerts, historicalSummary, refetchRules }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isEditRuleFlyoutOpen, setIsEditRuleFlyoutOpen] = useState(false);
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
        <SloCardChart
          slo={slo}
          historicalSliData={historicalSliData}
          badges={
            <SloCardItemBadges
              slo={slo}
              rules={rules}
              activeAlerts={activeAlerts}
              handleCreateRule={handleCreateRule}
              hasGroupBy={Boolean(slo.groupBy && slo.groupBy !== ALL_VALUE)}
            />
          }
        />
        {(isMouseOver || isActionsPopoverOpen) && (
          <SloCardItemActions
            slo={slo}
            rules={rules}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setDeleteConfirmationModalOpen={setDeleteConfirmationModalOpen}
            setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
            setDashboardAttachmentReady={setDashboardAttachmentReady}
          />
        )}
      </EuiPanel>

      <BurnRateRuleFlyout
        slo={slo}
        isAddRuleFlyoutOpen={isAddRuleFlyoutOpen}
        setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
      />

      <EditBurnRateRuleFlyout
        rule={rules?.[0]}
        isEditRuleFlyoutOpen={isEditRuleFlyoutOpen}
        setIsEditRuleFlyoutOpen={setIsEditRuleFlyoutOpen}
        refetchRules={refetchRules}
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
          objectType={i18n.translate('xpack.slo.item.actions.addToDashboard.objectTypeLabel', {
            defaultMessage: 'SLO Overview',
          })}
          documentInfo={{
            title: i18n.translate('xpack.slo.item.actions.addToDashboard.attachmentTitle', {
              defaultMessage: 'SLO Overview',
            }),
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
  badges,
  onClick,
  historicalSliData,
}: {
  badges: React.ReactNode;
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
                  id="xpack.slo.sLOGridItem.targetFlexItemLabel"
                  defaultMessage="Target {target}"
                  values={{
                    target: sloTarget,
                  }}
                />
              ),
              icon: () => <EuiIcon type="visGauge" size="l" />,
              color: cardColor,
              body: badges,
            },
          ],
        ]}
      />
    </Chart>
  );
}
