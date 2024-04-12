/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, Pagination } from '@elastic/eui';
import { EuiSpacer, EuiInMemoryTable, EuiTitle, EuiCallOut, EuiText } from '@elastic/eui';
import React, { useCallback, useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { get } from 'lodash/fp';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../../../../common/constants';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';
import { ActionColumn } from '../../components/action_column';
import { RiskInputsUtilityBar } from '../../components/utility_bar';
import { useRiskContributingAlerts } from '../../../../hooks/use_risk_contributing_alerts';
import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { HostRiskScore, UserRiskScore } from '../../../../../../common/search_strategy';
import {
  buildHostNamesFilter,
  buildUserNamesFilter,
  isUserRiskScore,
} from '../../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../../common/entity_analytics/risk_engine';
import { AssetCriticalityBadge } from '../../../asset_criticality';

export interface RiskInputsTabProps extends Record<string, unknown> {
  entityType: RiskScoreEntity;
  entityName: string;
}

export interface AlertRawData {
  fields: Record<string, string[]>;
  _index: string;
  _id: string;
}

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

  const alertsColumns: Array<EuiBasicTableColumn<AlertRawData>> = useMemo(
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
            defaultMessage="Rule name"
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

  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);

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

  const riskInputsAlertSection = (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-alert-title">
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
        columns={alertsColumns}
        pagination
        sorting
        selection={euiTableSelectionProps}
        onTableChange={onTableChange}
        isSelectable
        itemId="_id"
      />
    </>
  );

  return (
    <>
      {isAssetCriticalityEnabled && (
        <RiskInputsAssetCriticalitySection loading={loadingRiskScore} riskScore={riskScore} />
      )}
      {riskInputsAlertSection}
    </>
  );
};

const RiskInputsAssetCriticalitySection: React.FC<{
  riskScore?: UserRiskScore | HostRiskScore;
  loading: boolean;
}> = ({ riskScore, loading }) => {
  const criticalityLevel = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    if (isUserRiskScore(riskScore)) {
      return riskScore.user.risk.criticality_level;
    }

    return riskScore.host.risk.criticality_level;
  }, [riskScore]);

  if (loading || criticalityLevel === undefined) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-asset-criticality-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityTitle"
            defaultMessage="Asset Criticality"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityDescription"
          defaultMessage="The criticality assigned at the time of the risk score calculation."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <AssetCriticalityBadge
        criticalityLevel={criticalityLevel}
        dataTestSubj="risk-inputs-asset-criticality-badge"
      />

      <EuiSpacer size="m" />
    </>
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';
