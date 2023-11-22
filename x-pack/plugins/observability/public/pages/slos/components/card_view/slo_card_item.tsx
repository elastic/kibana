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
  Metric,
  Settings,
  DARK_THEME,
  MetricTrendShape,
} from '@elastic/charts';
import { EuiIcon, EuiPanel, useEuiBackgroundColor } from '@elastic/eui';
import { SLOWithSummaryResponse, HistoricalSummaryResponse, ALL_VALUE } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { useDeleteSlo } from '../../../../hooks/slo/use_delete_slo';
import { sloKeys } from '../../../../hooks/slo/query_key_factory';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../utils/kibana_react';
import { sloFeatureId } from '../../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../../common/constants';
import { useSloFormattedSummary } from '../../hooks/use_slo_summary';
import { SloCardItemActions } from './slo_card_item_actions';
import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloCardItemBadges } from './slo_card_item_badges';

export interface Props {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
  loading: boolean;
  error: boolean;
}

const useCardColor = (status?: SLOWithSummaryResponse['summary']['status']) => {
  const colors = {
    DEGRADING: useEuiBackgroundColor('warning'),
    VIOLATED: useEuiBackgroundColor('danger'),
    HEALTHY: useEuiBackgroundColor('success'),
    NO_DATA: useEuiBackgroundColor('subdued'),
  };

  return colors[status ?? 'NO_DATA'];
};

export function SloCardItem({ slo, rules, activeAlerts, historicalSummary }: Props) {
  const {
    application: { navigateToUrl },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const { sliValue, sloTarget, sloDetailsUrl } = useSloFormattedSummary(slo);
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const queryClient = useQueryClient();
  const { mutate: deleteSlo } = useDeleteSlo();
  const cardColor = useCardColor(slo.summary.status);

  const historicalSliData = formatHistoricalData(historicalSummary, 'sli_value');

  const handleSavedRule = async () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
  };

  const handleDeleteConfirm = () => {
    setDeleteConfirmationModalOpen(false);
    deleteSlo({ id: slo.id, name: slo.name });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };

  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  return (
    <>
      <EuiPanel
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
        style={{
          height: '182px',
          overflow: 'hidden',
          position: 'relative',
        }}
        title={slo.summary.status}
      >
        <Chart>
          <Settings
            baseTheme={DARK_THEME}
            onElementClick={([d]) => {
              if (isMetricElementEvent(d)) {
                navigateToUrl(sloDetailsUrl);
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
                  subtitle:
                    slo.groupBy && slo.groupBy !== ALL_VALUE
                      ? `${slo.groupBy}: ${slo.instanceId}`
                      : undefined,
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
        <SloCardItemBadges
          slo={slo}
          rules={rules}
          activeAlerts={activeAlerts}
          handleCreateRule={handleCreateRule}
          hasGroupBy={Boolean(slo.groupBy && slo.groupBy !== ALL_VALUE)}
        />
        {(isMouseOver || isActionsPopoverOpen) && (
          <SloCardItemActions
            slo={slo}
            isActionsPopoverOpen={isActionsPopoverOpen}
            setIsActionsPopoverOpen={setIsActionsPopoverOpen}
            setIsAddRuleFlyoutOpen={setIsAddRuleFlyoutOpen}
            setDeleteConfirmationModalOpen={setDeleteConfirmationModalOpen}
          />
        )}
      </EuiPanel>
      {isAddRuleFlyoutOpen ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          initialValues={{ name: `${slo.name} Burn Rate rule`, params: { sloId: slo.id } }}
          onSave={handleSavedRule}
          onClose={() => {
            setIsAddRuleFlyoutOpen(false);
          }}
          useRuleProducer
        />
      ) : null}

      {isDeleteConfirmationModalOpen ? (
        <SloDeleteConfirmationModal
          slo={slo}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
