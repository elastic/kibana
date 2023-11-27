/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { useEuiBackgroundColor, EuiSpacer, EuiInMemoryTable, EuiTitle } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import type { RiskInputs } from '../../../../common/risk_engine';
import { ActionColumn } from './components/action_column';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { RiskInputsUtilityBar } from './components/utility_bar';
import { useAlertsByIds } from '../../../common/containers/alerts/use_alerts_by_ids';
import { FlyoutBody } from '../../shared/components/flyout_body';

export interface RiskInputsPanelContentProps extends Record<string, unknown> {
  riskInputs: RiskInputs;
}

export interface AlertRawData {
  fields: Record<string, string[]>;
  _index: string;
  _id: string;
}

export const RiskInputsPanelContent = ({ riskInputs }: RiskInputsPanelContentProps) => {
  const [selectedItems, setSelectedItems] = useState<AlertRawData[]>([]);
  const alertIds = useMemo(() => riskInputs.map(({ id }) => id), [riskInputs]);
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
      totalItemCount: riskInputs.length,
      pageIndex: currentPage.index,
      pageSize: currentPage.size,
    }),
    [currentPage.index, currentPage.size, riskInputs.length]
  );

  return (
    <>
      <FlyoutBody
        css={css`
          background-color: ${useEuiBackgroundColor('subdued')};
        `}
        data-test-subj="risk-inputs-panel"
      >
        <EuiTitle>
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.riskInputs.title"
              defaultMessage="Risk Inputs"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="m" />
        {/* Temporary label. It will be replaced by a filter */}
        <EuiTitle size="xs">
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
      </FlyoutBody>
    </>
  );
};

RiskInputsPanelContent.displayName = 'RiskInputsPanelContent';
