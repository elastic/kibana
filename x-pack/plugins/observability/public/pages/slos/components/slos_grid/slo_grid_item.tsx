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
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';
import { SLOWithSummaryResponse, HistoricalSummaryResponse } from '@kbn/slo-schema';
import { Rule } from '@kbn/triggers-actions-ui-plugin/public';
import { useQueryClient } from '@tanstack/react-query';
import { euiLightVars } from '@kbn/ui-theme';
import { SloGridItemBadges } from './slo_grid_item_badges';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { useDeleteSlo } from '../../../../hooks/slo/use_delete_slo';
import { sloKeys } from '../../../../hooks/slo/query_key_factory';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { useKibana } from '../../../../utils/kibana_react';
import { sloFeatureId } from '../../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../../common/constants';
import { useSLOSummary } from '../../hooks/use_slo_summary';
import { SloGridItemActions } from './slo_grid_item_actions';
import { SloRule } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';

export interface Props {
  slo: SLOWithSummaryResponse;
  rules: Array<Rule<SloRule>> | undefined;
  historicalSummary?: HistoricalSummaryResponse[];
  historicalSummaryLoading: boolean;
  activeAlerts?: number;
  loading: boolean;
  error: boolean;
}

export const getColor = (
  isEnabled: boolean,
  status?: SLOWithSummaryResponse['summary']['status']
) => {
  if (!isEnabled) {
    return euiLightVars.euiColorLightestShade;
  }

  switch (status) {
    case 'DEGRADING':
      return euiLightVars.euiColorVis7_behindText;
    case 'VIOLATED':
      return euiLightVars.euiColorVis9_behindText;
    case 'HEALTHY':
      return euiLightVars.euiColorVis0_behindText;
    case 'NO_DATA':
      return euiLightVars.euiColorGhost;
    default:
      return euiLightVars.euiColorVis0_behindText;
  }
};

export function SloGridItem({ slo, rules, activeAlerts, historicalSummary }: Props) {
  const {
    application: { navigateToUrl },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const [isMouseOver, setIsMouseOver] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const [isAddRuleFlyoutOpen, setIsAddRuleFlyoutOpen] = useState(false);
  const [isDeleteConfirmationModalOpen, setDeleteConfirmationModalOpen] = useState(false);

  const { currentValue, sloTarget, sloDetailsUrl } = useSLOSummary(slo);
  const filteredRuleTypes = useGetFilteredRuleTypes();
  const queryClient = useQueryClient();
  const { mutate: deleteSlo } = useDeleteSlo();

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
          height: '200px',
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
          />
          <Metric
            id={`${slo.id}-${slo.instanceId}`}
            data={[
              [
                {
                  title: slo.name,
                  value: currentValue,
                  trendShape: MetricTrendShape.Area,
                  trend: historicalSliData?.map((d) => ({
                    x: d.key as number,
                    y: d.value as number,
                  })),
                  extra: (
                    <EuiFlexGroup
                      alignItems="center"
                      gutterSize="xs"
                      justifyContent="flexEnd"
                      // empty title to prevent default title from showing
                      title=""
                      component="span"
                    >
                      <EuiFlexItem grow={false} component="span">
                        <FormattedMessage
                          id="xpack.observability.sLOGridItem.targetFlexItemLabel"
                          defaultMessage="Target {target}"
                          values={{
                            target: sloTarget,
                          }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                  icon: () => <EuiIcon type="visGauge" size="l" />,
                  color: getColor(true, slo.summary.status),
                },
              ],
            ]}
          />
        </Chart>
        <SloGridItemBadges
          slo={slo}
          rules={rules}
          activeAlerts={activeAlerts}
          handleCreateRule={handleCreateRule}
        />
        {(isMouseOver || isActionsPopoverOpen) && (
          <SloGridItemActions
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
