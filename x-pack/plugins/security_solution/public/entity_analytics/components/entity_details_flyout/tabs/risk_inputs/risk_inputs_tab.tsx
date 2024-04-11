/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiSpacer, EuiInMemoryTable, EuiTitle, EuiCallOut } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useMemo, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useUiSetting$ } from '@kbn/kibana-react-plugin/public';
import { ALERT_RULE_NAME } from '@kbn/rule-data-utils';

import { get } from 'lodash/fp';
import type {
  InputAlert,
  UseRiskContributingAlertsResult,
} from '../../../../hooks/use_risk_contributing_alerts';
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
import { ActionColumn } from '../../components/action_column';

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

  const alerts = useRiskContributingAlerts({ riskScore });

  const euiTableSelectionProps = useMemo(
    () => ({
      initialSelected: [],
      selectable: () => true,
      onSelectionChange: setSelectedItems,
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
        render: (data: InputAlert) => <ActionColumn input={data} />,
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
        align: 'right',
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
      <EuiSpacer size="s" />
      <ExtraAlertsMessage riskScore={riskScore} alerts={alerts} />
    </>
  );

  return (
    <>
      {isAssetCriticalityEnabled && (
        <ContextsSection loading={loadingRiskScore} riskScore={riskScore} />
      )}
      <EuiSpacer size="m" />
      {riskInputsAlertSection}
    </>
  );
};

RiskInputsTab.displayName = 'RiskInputsTab';

const ContextsSection: React.FC<{
  riskScore?: UserRiskScore | HostRiskScore;
  loading: boolean;
}> = ({ riskScore, loading }) => {
  const criticality = useMemo(() => {
    if (!riskScore) {
      return undefined;
    }

    if (isUserRiskScore(riskScore)) {
      return {
        level: riskScore.user.risk.criticality_level,
        contribution: riskScore.user.risk.category_2_score,
      };
    }

    return {
      level: riskScore.host.risk.criticality_level,
      contribution: riskScore.host.risk.category_2_score,
    };
  }, [riskScore]);

  if (loading || criticality === undefined) {
    return null;
  }

  return (
    <>
      <EuiTitle size="xs" data-test-subj="risk-input-contexts-title">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.entityDetails.riskInputs.contextsTitle"
            defaultMessage="Contexts"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiInMemoryTable
        compressed={true}
        loading={loading}
        columns={contextColumns}
        items={[
          {
            field: (
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskInputs.assetCriticalityField"
                defaultMessage="Asset Criticality Level"
              />
            ),
            value: (
              <AssetCriticalityBadgeAllowMissing
                criticalityLevel={criticality.level}
                dataTestSubj="risk-inputs-asset-criticality-badge"
              />
            ),
            contribution: (criticality.contribution || 0).toFixed(2),
          },
        ]}
      />
    </>
  );
};

interface ContextRow {
  field: ReactNode;
  value: ReactNode;
  contribution: string;
}

const contextColumns: Array<EuiBasicTableColumn<ContextRow>> = [
  {
    field: 'field',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.fieldColumn"
        defaultMessage="Field"
      />
    ),
    width: '30%',
    render: (field: ContextRow['field']) => field,
  },
  {
    field: 'value',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.valueColumn"
        defaultMessage="Value"
      />
    ),
    width: '30%',
    render: (val: ContextRow['value']) => val,
  },
  {
    field: 'contribution',
    width: '30%',
    align: 'right',
    name: (
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.riskInputs.contributionColumn"
        defaultMessage="Contribution"
      />
    ),
    render: (score: ContextRow['contribution']) => score,
  },
];

interface ExtraAlertsMessageProps {
  riskScore?: UserRiskScore | HostRiskScore;
  alerts: UseRiskContributingAlertsResult;
}
const ExtraAlertsMessage: React.FC<ExtraAlertsMessageProps> = ({ riskScore, alerts }) => {
  const totals = !riskScore
    ? { count: 0, score: 0 }
    : isUserRiskScore(riskScore)
    ? { count: riskScore.user.risk.category_1_count, score: riskScore.user.risk.category_1_score }
    : { count: riskScore.host.risk.category_1_count, score: riskScore.host.risk.category_1_score };

  const displayed = {
    count: alerts.data?.length || 0,
    score: alerts.data?.reduce((sum, { input }) => sum + (input.contribution_score || 0), 0) || 0,
  };

  if (displayed.count >= totals.count) {
    return null;
  }
  return (
    <EuiCallOut
      data-test-subj="risk-input-extra-alerts-message"
      size="s"
      title={
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.riskInputs.extraAlertsMessage"
          defaultMessage="{count} more alerts contributed {score} to the calculated risk score"
          values={{
            count: totals.count - displayed.count,
            score: (totals.score - displayed.score).toFixed(2),
          }}
        />
      }
      iconType="annotation"
    />
  );
};
