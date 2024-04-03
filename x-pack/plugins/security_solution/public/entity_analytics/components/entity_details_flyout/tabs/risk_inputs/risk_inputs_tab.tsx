/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiInMemoryTable, EuiTitle, EuiCallOut, EuiText } from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

import { get } from 'lodash/fp';
import type { InputAlert } from '../../../../hooks/use_risk_contributing_alerts';
import { useRiskContributingAlerts } from '../../../../hooks/use_risk_contributing_alerts';
import { ENABLE_ASSET_CRITICALITY_SETTING } from '../../../../../../common/constants';
import { PreferenceFormattedDate } from '../../../../../common/components/formatted_date';

import { useRiskScore } from '../../../../api/hooks/use_risk_score';
import type { HostRiskScore, UserRiskScore } from '../../../../../../common/search_strategy';
import {
  buildHostNamesFilter,
  buildUserNamesFilter,
  isUserRiskScore,
} from '../../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../../common/entity_analytics/risk_engine';
import { AssetCriticalityBadgeAllowMissing } from '../../../asset_criticality';
import { RiskInputsUtilityBar } from '../../components/utility_bar';

export interface RiskInputsTabProps extends Record<string, unknown> {
  entityType: RiskScoreEntity;
  entityName: string;
}

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export const RiskInputsTab = ({ entityType, entityName }: RiskInputsTabProps) => {
  const [selectedItems, setSelectedItems] = useState<InputAlert[]>([]);

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

  const alerts = useRiskContributingAlerts({ riskScore, entityType });

  const euiTableSelectionProps = useMemo(
    () => ({
      onSelectionChange: (selected: InputAlert[]) => {
        setSelectedItems(selected);
      },
      initialSelected: [],
      selectable: () => true,
    }),
    []
  );

  const inputColumns: Array<EuiBasicTableColumn<InputAlert>> = useMemo(
    () => [
      {
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.actionsColumn"
            defaultMessage="Actions"
          />
        ),
        width: '80px',
        render: (data: InputAlert) => {
          return 'placeholder';
          // return <ActionColumn inputAlert={data} />;
        },
      },
      {
        field: 'input.timestamp',
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
        field: 'alert',
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
        render: (alert: InputAlert['alert']) => get(ALERT_RULE_NAME, alert),
      },
      {
        field: 'input.contribution_score',
        'data-test-subj': 'risk-input-table-contribution-cell',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
            defaultMessage="Contribution"
          />
        ),
        truncateText: false,
        mobileOptions: { show: true },
        sortable: true,
        render: (contribution: number) => contribution.toFixed(2),
      },
    ],
    []
  );

  const [isAssetCriticalityEnabled] = useUiSetting$<boolean>(ENABLE_ASSET_CRITICALITY_SETTING);

  if (riskScoreError) {
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
      <RiskInputsUtilityBar riskInputs={selectedItems} />
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        compressed={true}
        loading={loadingRiskScore || alerts.loading}
        items={alerts.data || []}
        columns={inputColumns}
        sorting
        selection={euiTableSelectionProps}
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
      <AssetCriticalityBadgeAllowMissing
        criticalityLevel={criticalityLevel}
        dataTestSubj="risk-inputs-asset-criticality-badge"
      />

      <EuiSpacer size="m" />
    </>
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';
