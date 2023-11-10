/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DefaultItemAction,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { NOT_AVAILABLE_LABEL } from '../../../../../common/i18n';
import { rulesLocatorID, sloFeatureId } from '../../../../../common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '../../../../../common/constants';
import { paths } from '../../../../../common/locators/paths';
import { SloDeleteConfirmationModal } from '../../../../components/slo/delete_confirmation_modal/slo_delete_confirmation_modal';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { sloKeys } from '../../../../hooks/slo/query_key_factory';
import { useCapabilities } from '../../../../hooks/slo/use_capabilities';
import { useCloneSlo } from '../../../../hooks/slo/use_clone_slo';
import { useDeleteSlo } from '../../../../hooks/slo/use_delete_slo';
import { useFetchActiveAlerts } from '../../../../hooks/slo/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/slo/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { useGetFilteredRuleTypes } from '../../../../hooks/use_get_filtered_rule_types';
import { RulesParams } from '../../../../locators/rules';
import { useKibana } from '../../../../utils/kibana_react';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import {
  transformCreateSLOFormToCreateSLOInput,
  transformSloResponseToCreateSloForm,
} from '../../../slo_edit/helpers/process_slo_form_values';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { SloSparkline } from '../slo_sparkline';
import { SloRulesBadge } from '../badges/slo_rules_badge';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListTableView({ sloList, loading, error }: Props) {
  const {
    application: { navigateToUrl },
    http: { basePath },
    uiSettings,
    share: {
      url: { locators },
    },
    triggersActionsUi: { getAddRuleFlyout: AddRuleFlyout },
  } = useKibana().services;

  const percentFormat = uiSettings.get('format:percent:defaultPattern');
  const sloIdsAndInstanceIds = sloList.map(
    (slo) => [slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]
  );

  const { hasWriteCapabilities } = useCapabilities();
  const filteredRuleTypes = useGetFilteredRuleTypes();

  const queryClient = useQueryClient();
  const { mutate: cloneSlo } = useCloneSlo();
  const { mutate: deleteSlo } = useDeleteSlo();

  const [sloToAddRule, setSloToAddRule] = useState<SLOWithSummaryResponse | undefined>(undefined);
  const [sloToDelete, setSloToDelete] = useState<SLOWithSummaryResponse | undefined>(undefined);

  const handleDeleteConfirm = () => {
    if (sloToDelete) {
      deleteSlo({ id: sloToDelete.id, name: sloToDelete.name });
    }
    setSloToDelete(undefined);
  };

  const handleDeleteCancel = () => {
    setSloToDelete(undefined);
  };

  const handleSavedRule = async () => {
    queryClient.invalidateQueries({ queryKey: sloKeys.rules(), exact: false });
  };

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  const actions: Array<DefaultItemAction<SLOWithSummaryResponse>> = [
    {
      type: 'icon',
      icon: 'inspect',
      name: i18n.translate('xpack.observability.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.details', {
        defaultMessage: 'Details',
      }),
      onClick: (slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.observability.sloDetails(
            slo.id,
            slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
          )
        );
        navigateToUrl(sloDetailsUrl);
      },
    },
    {
      type: 'icon',
      icon: 'pencil',
      name: i18n.translate('xpack.observability.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.edit', {
        defaultMessage: 'Edit',
      }),
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        navigateToUrl(basePath.prepend(paths.observability.sloEdit(slo.id)));
      },
    },
    {
      type: 'icon',
      icon: 'bell',
      name: i18n.translate('xpack.observability.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.createRule', {
        defaultMessage: 'Create new alert rule',
      }),
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        setSloToAddRule(slo);
      },
    },
    {
      type: 'icon',
      icon: 'gear',
      name: i18n.translate('xpack.observability.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.manageRules', {
        defaultMessage: 'Manage rules',
      }),
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        const locator = locators.get<RulesParams>(rulesLocatorID);
        locator?.navigate({ params: { sloId: slo.id } }, { replace: false });
      },
    },
    {
      type: 'icon',
      icon: 'copy',
      name: i18n.translate('xpack.observability.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.clone', {
        defaultMessage: 'Clone',
      }),
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => {
        const newSlo = transformCreateSLOFormToCreateSLOInput(
          transformSloResponseToCreateSloForm({ ...slo, name: `[Copy] ${slo.name}` })!
        );

        cloneSlo({ slo: newSlo, originalSloId: slo.id });
      },
    },
    {
      type: 'icon',
      icon: 'trash',
      name: i18n.translate('xpack.observability.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      description: i18n.translate('xpack.observability.slo.item.actions.delete', {
        defaultMessage: 'Delete',
      }),
      enabled: (_) => hasWriteCapabilities,
      onClick: (slo: SLOWithSummaryResponse) => setSloToDelete(slo),
    },
  ];

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = [
    {
      field: 'name',
      name: 'SLO name',
      width: '20%',
      truncateText: { lines: 2 },
      render: (_, slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.observability.sloDetails(
            slo.id,
            slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
          )
        );
        return (
          <EuiText size="s">
            {slo.summary ? (
              <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                {slo.name}
              </a>
            ) : (
              <span>{slo.name}</span>
            )}
          </EuiText>
        );
      },
    },

    {
      field: 'instance',
      name: 'Instance',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) => (
        <EuiToolTip
          position="top"
          content={i18n.translate('xpack.observability.slo.partitionByBadge', {
            defaultMessage: 'Partition by {partitionKey}',
            values: {
              partitionKey: slo.groupBy,
            },
          })}
          display="block"
        >
          <span>{slo.instanceId}</span>
        </EuiToolTip>
      ),
    },
    {
      field: 'status',
      name: 'Status',
      render: (_, slo: SLOWithSummaryResponse) => <SloStatusBadge slo={slo} />,
    },
    {
      field: 'objective',
      name: 'Objective',
      render: (_, slo: SLOWithSummaryResponse) => numeral(slo.objective.target).format('0.00%'),
    },
    {
      field: 'sli',
      name: 'SLI value',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.sliValue).format(percentFormat),
    },
    {
      field: 'historicalSli',
      name: 'Historical SLI',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
        const historicalSliData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id &&
              historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
          )?.data,
          'sli_value'
        );
        return (
          <SloSparkline
            chart="line"
            id="sli_history"
            state={isSloFailed ? 'error' : 'success'}
            data={historicalSliData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },
    {
      field: 'errorBudgetRemaining',
      name: 'Budget remaining',
      truncateText: true,
      render: (_, slo: SLOWithSummaryResponse) =>
        slo.summary.status === 'NO_DATA'
          ? NOT_AVAILABLE_LABEL
          : numeral(slo.summary.errorBudget.remaining).format(percentFormat),
    },
    {
      field: 'historicalErrorBudgetRemaining',
      name: 'Historical budget remaining',
      render: (_, slo: SLOWithSummaryResponse) => {
        const isSloFailed = slo.summary.status === 'VIOLATED' || slo.summary.status === 'DEGRADING';
        const errorBudgetBurnDownData = formatHistoricalData(
          historicalSummaries.find(
            (historicalSummary) =>
              historicalSummary.sloId === slo.id &&
              historicalSummary.instanceId === (slo.instanceId ?? ALL_VALUE)
          )?.data,
          'error_budget_remaining'
        );
        return (
          <SloSparkline
            chart="area"
            id="error_budget_burn_down"
            state={isSloFailed ? 'error' : 'success'}
            data={errorBudgetBurnDownData}
            isLoading={historicalSummaryLoading}
          />
        );
      },
    },
    {
      field: 'alerts',
      name: 'Alerts',
      render: (_, slo: SLOWithSummaryResponse) => (
        <>
          <SloRulesBadge rules={rulesBySlo?.[slo.id]} onClick={() => setSloToAddRule(slo)} />
          <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlertsBySlo.get(slo)} />
        </>
      ),
    },
    {
      name: 'Actions',
      actions,
    },
  ];

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  return (
    <>
      <EuiBasicTable<SLOWithSummaryResponse> items={sloList} columns={columns} />
      {sloToAddRule ? (
        <AddRuleFlyout
          consumer={sloFeatureId}
          filteredRuleTypes={filteredRuleTypes}
          ruleTypeId={SLO_BURN_RATE_RULE_TYPE_ID}
          initialValues={{
            name: `${sloToAddRule.name} Burn Rate rule`,
            params: { sloId: sloToAddRule.id },
          }}
          onSave={handleSavedRule}
          onClose={() => {
            setSloToAddRule(undefined);
          }}
          useRuleProducer
        />
      ) : null}

      {sloToDelete ? (
        <SloDeleteConfirmationModal
          slo={sloToDelete}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </>
  );
}
