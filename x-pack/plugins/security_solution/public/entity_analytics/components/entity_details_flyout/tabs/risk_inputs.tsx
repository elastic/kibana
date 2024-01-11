/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { EuiHealth, EuiSpacer, EuiInMemoryTable, EuiTitle, EuiCallOut } from '@elastic/eui';
import { euiLightVars } from '@kbn/ui-theme';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import styled from '@emotion/styled';
import type { CriticalityLevel } from '../../../../../common/entity_analytics/asset_criticality/types';
import { BasicTable } from '../../../../common/components/ml/tables/basic_table';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { ActionColumn } from '../components/action_column';
import { RiskInputsUtilityBar } from '../components/utility_bar';
import { AssetCriticalityBadge } from '../../asset_criticality';
import { useRiskContributingAlerts } from '../../../hooks/use_risk_contributing_alerts';
import { useRiskScore } from '../../../api/hooks/use_risk_score';
import type { UserRiskScore, HostRiskScore } from '../../../../../common/search_strategy';
import {
  buildHostNamesFilter,
  buildUserNamesFilter,
  isUserRiskScore,
} from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/entity_analytics/risk_engine';

export interface RiskInputsTabProps extends Record<string, unknown> {
  entityType: RiskScoreEntity;
  entityName: string;
}

export interface AlertRawData {
  fields: Record<string, string[]>;
  _index: string;
  _id: string;
}

const FieldLabel = styled.span`
  font-weight: ${euiLightVars.euiFontWeightMedium};
  color: ${euiLightVars.euiTitleColor};
`;

const CriticalityField: React.FC<{ criticalityLevel?: CriticalityLevel }> = ({
  criticalityLevel,
}) => {
  if (criticalityLevel) {
    return (
      <AssetCriticalityBadge
        criticalityLevel={criticalityLevel}
        dataTestSubj="risk-inputs-asset-criticality-badge"
      />
    );
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

const ContextsTable: React.FC<{ riskScore?: UserRiskScore | HostRiskScore; loading: boolean }> = ({
  riskScore,
  loading,
}) => {
  const criticalityLevel = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    if (isUserRiskScore(riskScore)) {
      return riskScore.user.risk.criticality_level;
    }

    return riskScore.host.risk.criticality_level;
  }, [riskScore]);

  const columns = [
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.fieldColumnTitle"
          defaultMessage="Field"
        />
      ),
      field: 'label',
      render: (label: string) => <FieldLabel>{label}</FieldLabel>,
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
    <BasicTable
      data-test-subj="contexts-table"
      columns={columns}
      items={items}
      compressed={true}
      loading={loading}
    />
  );
};

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const RiskInputsTab = ({ entityType, entityName }: RiskInputsTabProps) => {
  const [selectedItems, setSelectedItems] = useState<AlertRawData[]>([]);

  const nameFilterQuery = useMemo(() => {
    if (entityType === RiskScoreEntity.host) {
      return buildHostNamesFilter([entityName]);
    } else if (entityType === RiskScoreEntity.user) {
      return buildUserNamesFilter([entityName]);
    }
  }, [entityName, entityType]);

  const {
    data: riskScoreData,
    error: riskScoreError,
    loading: loadingRiskScore,
  } = useRiskScore({
    riskEntity: entityType,
    filterQuery: nameFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: nameFilterQuery === undefined,
  });

  const riskScore = riskScoreData && riskScoreData.length > 0 ? riskScoreData[0] : undefined;
  console.log('riskScore', riskScore);
  const {
    loading: loadingAlerts,
    data: alertsData,
    error: riskAlertsError,
  } = useRiskContributingAlerts({ riskScore });

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
      totalItemCount: alertsData?.length ?? 0,
      pageIndex: currentPage.index,
      pageSize: currentPage.size,
    }),
    [currentPage.index, currentPage.size, alertsData?.length]
  );

  if (riskScoreError || riskAlertsError) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorTitle"
            defaultMessage="Something went wrong"
          />
        }
        color="danger"
        iconType="error"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.errorBody"
            defaultMessage="Error while fetching risk inputs. Please try again later."
          />
        </p>
      </EuiCallOut>
    );
  }

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
      <ContextsTable riskScore={riskScore} loading={loadingRiskScore} />
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
        loading={loadingRiskScore || loadingAlerts}
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
