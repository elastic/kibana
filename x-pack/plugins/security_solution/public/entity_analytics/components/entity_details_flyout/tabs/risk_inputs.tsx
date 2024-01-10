/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { EuiHealth, EuiSpacer, EuiInMemoryTable, EuiTitle } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { CriticalityLevel } from '../../../../../common/entity_analytics/asset_criticality/types';
import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { useAlertsByIds } from '../../../../common/containers/alerts/use_alerts_by_ids';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { ActionColumn } from '../components/action_column';
import { RiskInputsUtilityBar } from '../components/utility_bar';
import { AssetCriticalityBadge } from '../../asset_criticality';
export interface RiskInputsTabProps extends Record<string, unknown> {
  alertIds: string[];
  criticalityLevel?: CriticalityLevel;
}

export interface AlertRawData {
  fields: Record<string, string[]>;
  _index: string;
  _id: string;
}

const CriticalityField: React.FC<{ criticalityLevel: RiskInputsTabProps['criticalityLevel'] }> = ({
  criticalityLevel,
}) => {
  if (criticalityLevel) {
    return <AssetCriticalityBadge criticalityLevel={criticalityLevel} />;
  }

  return (
    <EuiHealth color="subdued" data-test-subj="no-criticality">
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.noCriticality"
        defaultMessage="No criticality assigned"
      />
    </EuiHealth>
  );
};

const ContextsTable: React.FC<{ criticalityLevel: RiskInputsTabProps['criticalityLevel'] }> = ({
  criticalityLevel,
}) => {
  const columns = [
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.fieldColumnTitle"
          defaultMessage="Field"
        />
      ),
      field: 'label',
      render: (label: string) => (
        <span
          css={css`
            font-weight: ${euiLightVars.euiFontWeightMedium};
            color: ${euiLightVars.euiTitleColor};
          `}
        >
          {label}
        </span>
      ),
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.valuesColumnTitle"
          defaultMessage="Values"
        />
      ),
      field: 'field',
      render: (field: string | undefined, { render }: { render: () => JSX.Element }) => render(),
    },
  ];

  const items = [
    {
      label: 'Asset Criticality Level',
      render: () => <CriticalityField criticalityLevel={criticalityLevel} />,
    },
  ];

  return (
    <BasicTable data-test-subj="contexts-table" columns={columns} items={items} compressed={true} />
  );
};

export const RiskInputsTab = ({ alertIds, criticalityLevel }: RiskInputsTabProps) => {
  const [selectedItems, setSelectedItems] = useState<AlertRawData[]>([]);
  const { loading, data: alertsData } = useAlertsByIds({ alertIds });
  const euiTableSelectionProps = useMemo(
    () => ({
      onSelectionChange: (selected: AlertRawData[]) => {
        setSelectedItems(selected);
      },
      initialSelected: [],
      selectable: () => true,
    }),
    []
  );

  const columns: Array<EuiBasicTableColumn<AlertRawData>> = useMemo(
    () => [
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actionsColumn"
            defaultMessage="Actions"
          />
        ),
        width: '80px',
        render: (alert: AlertRawData) => {
          return <ActionColumn alert={alert} />;
        },
      },
      {
        field: 'fields.@timestamp',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.dateColumn"
            defaultMessage="Date"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        width: '30%',
        render: (timestamp: string) => <PreferenceFormattedDate value={new Date(timestamp)} />,
      },
      {
        field: 'fields',
        'data-test-subj': 'risk-input-table-description-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.riskInputColumn"
            defaultMessage="Risk input"
          />
        ),
        truncateText: true,
        mobileOptions: { show: true },
        sortable: true,
        render: (fields: AlertRawData['fields']) => get(ALERT_RULE_NAME, fields),
      },
    ],
    []
  );

  const [currentPage, setCurrentPage] = useState<{
    index: number;
    size: number;
  }>({ index: 0, size: 10 });

  const onTableChange = useCallback(({ page }) => {
    setCurrentPage(page);
  }, []);

  const pagination: Pagination = useMemo(
    () => ({
      totalItemCount: alertIds.length,
      pageIndex: currentPage.index,
      pageSize: currentPage.size,
    }),
    [currentPage.index, currentPage.size, alertIds.length]
  );

  return (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-tab-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTitle"
            defaultMessage="Contexts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <ContextsTable criticalityLevel={criticalityLevel} />
      <EuiSpacer size="m" />
      <EuiTitle size="xs" data-test-subj="risk-input-tab-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.alertsTitle"
            defaultMessage="Alerts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <RiskInputsUtilityBar pagination={pagination} selectedAlerts={selectedItems} />
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        compressed={true}
        loading={loading}
        items={alertsData ?? []}
        columns={columns}
        pagination
        sorting
        selection={euiTableSelectionProps}
        onTableChange={onTableChange}
        isSelectable
        itemId="_id"
      />
    </>
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';
