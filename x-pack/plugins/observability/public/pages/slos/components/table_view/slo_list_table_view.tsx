/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTableFieldDataColumnType,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { ALL_VALUE, SLOWithSummaryResponse } from '@kbn/slo-schema';
import React from 'react';
import { paths } from '../../../../../common/locators/paths';
import { SloStatusBadge } from '../../../../components/slo/slo_status_badge';
import { SloActiveAlertsBadge } from '../../../../components/slo/slo_status_badge/slo_active_alerts_badge';
import { useFetchActiveAlerts } from '../../../../hooks/slo/use_fetch_active_alerts';
import { useFetchHistoricalSummary } from '../../../../hooks/slo/use_fetch_historical_summary';
import { useFetchRulesForSlo } from '../../../../hooks/slo/use_fetch_rules_for_slo';
import { useKibana } from '../../../../utils/kibana_react';
import { formatHistoricalData } from '../../../../utils/slo/chart_data_formatter';
import { SloListEmpty } from '../slo_list_empty';
import { SloListError } from '../slo_list_error';
import { SloSparkline } from '../slo_sparkline';

export interface Props {
  sloList: SLOWithSummaryResponse[];
  loading: boolean;
  error: boolean;
}

export function SloListTableView({ sloList, loading, error }: Props) {
  const {
    http: { basePath },
    uiSettings,
  } = useKibana().services;
  const percentFormat = uiSettings.get('format:percent:defaultPattern');

  const sloIdsAndInstanceIds = sloList.map(
    (slo) => [slo.id, slo.instanceId ?? ALL_VALUE] as [string, string]
  );

  const { data: activeAlertsBySlo } = useFetchActiveAlerts({ sloIdsAndInstanceIds });
  const { data: rulesBySlo } = useFetchRulesForSlo({
    sloIds: sloIdsAndInstanceIds.map((item) => item[0]),
  });
  const { isLoading: historicalSummaryLoading, data: historicalSummaries = [] } =
    useFetchHistoricalSummary({
      list: sloList.map((slo) => ({ sloId: slo.id, instanceId: slo.instanceId ?? ALL_VALUE })),
    });

  if (!loading && !error && sloList.length === 0) {
    return <SloListEmpty />;
  }

  if (!loading && error) {
    return <SloListError />;
  }

  const getRowProps = (slo: SLOWithSummaryResponse) => {
    const { id, instanceId } = slo;
    return {
      'data-test-subj': `row-${id}-${instanceId}`,
    };
  };

  const columns: Array<EuiBasicTableColumn<SLOWithSummaryResponse>> = [
    {
      field: 'name',
      name: 'SLO Name',
      render: (_, slo: SLOWithSummaryResponse) => {
        const sloDetailsUrl = basePath.prepend(
          paths.observability.sloDetails(
            slo.id,
            slo.groupBy !== ALL_VALUE && slo.instanceId ? slo.instanceId : undefined
          )
        );
        return (
          <EuiFlexGroup
            direction="row"
            responsive={false}
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow>
              <EuiText size="s">
                {slo.summary ? (
                  <a data-test-subj="o11ySloListItemLink" href={sloDetailsUrl}>
                    {slo.name}
                  </a>
                ) : (
                  <span>{slo.name}</span>
                )}
              </EuiText>
            </EuiFlexItem>
            <SloActiveAlertsBadge slo={slo} activeAlerts={activeAlertsBySlo.get(slo)} />
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'instance',
      name: 'Instance',
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
      name: 'SLI Value',
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
          <EuiFlexGroup
            direction="row"
            responsive={false}
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              {numeral(slo.summary.sliValue).format(percentFormat)}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SloSparkline
                chart="line"
                id="sli_history"
                state={isSloFailed ? 'error' : 'success'}
                data={historicalSliData}
                isLoading={historicalSummaryLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
    {
      field: 'errorBudgetRemaining',
      name: 'Error Budget Remaining',

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
          <EuiFlexGroup
            direction="row"
            responsive={false}
            gutterSize="s"
            alignItems="center"
            justifyContent="flexEnd"
          >
            <EuiFlexItem grow={false}>
              {numeral(slo.summary.errorBudget.remaining).format(percentFormat)}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <SloSparkline
                chart="area"
                id="error_budget_burn_down"
                state={isSloFailed ? 'error' : 'success'}
                data={errorBudgetBurnDownData}
                isLoading={historicalSummaryLoading}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];

  const getCellProps = (
    slo: SLOWithSummaryResponse,
    column: EuiTableFieldDataColumnType<SLOWithSummaryResponse>
  ) => {
    const { id, instanceId } = slo;
    const { field } = column;
    return {
      'data-test-subj': `cell-${id}-${instanceId}-${String(field)}`,
      textOnly: true,
    };
  };

  return (
    <EuiBasicTable<SLOWithSummaryResponse>
      items={sloList}
      columns={columns}
      rowProps={getRowProps}
      cellProps={getCellProps}
    />
  );
}
