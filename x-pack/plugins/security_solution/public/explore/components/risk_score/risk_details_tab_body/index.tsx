/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { RISKY_HOSTS_DASHBOARD_TITLE, RISKY_USERS_DASHBOARD_TITLE } from '../constants';
import { EnableRiskScore } from '../enable_risk_score';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { State } from '../../../../common/store';
import { hostsModel, hostsSelectors } from '../../../hosts/store';
import { usersSelectors } from '../../../users/store';
import { RiskInformationButtonEmpty } from '../risk_information';
import * as i18n from './translations';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { RiskScoreOverTime } from '../risk_score_over_time';
import { TopRiskScoreContributors } from '../top_risk_score_contributors';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import {
  HostRiskScoreQueryId,
  UserRiskScoreQueryId,
  useRiskScore,
} from '../../../containers/risk_score';
import type { HostRiskScore, UserRiskScore } from '../../../../../common/search_strategy';
import { buildEntityNameFilter, RiskScoreEntity } from '../../../../../common/search_strategy';
import type { UsersComponentsQueryProps } from '../../../users/pages/navigation/types';
import type { HostsComponentsQueryProps } from '../../../hosts/pages/navigation/types';
import { useDashboardButtonHref } from '../../../../common/hooks/use_dashboard_button_href';
import { RiskScoresNoDataDetected } from '../risk_score_onboarding/risk_score_no_data_detected';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeL};
`;

type ComponentsQueryProps = HostsComponentsQueryProps | UsersComponentsQueryProps;

const getDashboardTitle = (riskEntity: RiskScoreEntity) =>
  riskEntity === RiskScoreEntity.host ? RISKY_HOSTS_DASHBOARD_TITLE : RISKY_USERS_DASHBOARD_TITLE;

const RiskDetailsTabBodyComponent: React.FC<
  Pick<ComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    entityName: string;
    riskEntity: RiskScoreEntity;
  }
> = ({ entityName, startDate, endDate, setQuery, deleteQuery, riskEntity }) => {
  const queryId = useMemo(
    () =>
      riskEntity === RiskScoreEntity.host
        ? HostRiskScoreQueryId.HOST_DETAILS_RISK_SCORE
        : UserRiskScoreQueryId.USER_DETAILS_RISK_SCORE,
    [riskEntity]
  );

  const severitySelectionRedux = useDeepEqualSelector((state: State) =>
    riskEntity === RiskScoreEntity.host
      ? hostsSelectors.hostRiskScoreSeverityFilterSelector()(state, hostsModel.HostsType.details)
      : usersSelectors.userRiskScoreSeverityFilterSelector()(state)
  );

  const { buttonHref } = useDashboardButtonHref({
    to: endDate,
    from: startDate,
    title: getDashboardTitle(riskEntity),
  });

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const { toggleStatus: overTimeToggleStatus, setToggleStatus: setOverTimeToggleStatus } =
    useQueryToggle(`${queryId} overTime`);
  const { toggleStatus: contributorsToggleStatus, setToggleStatus: setContributorsToggleStatus } =
    useQueryToggle(`${queryId} contributors`);

  const filterQuery = useMemo(
    () => (entityName ? buildEntityNameFilter([entityName], riskEntity) : {}),
    [entityName, riskEntity]
  );
  const { data, loading, refetch, inspect, isDeprecated, isModuleEnabled } = useRiskScore({
    filterQuery,
    onlyLatest: false,
    riskEntity,
    skip: !overTimeToggleStatus && !contributorsToggleStatus,
    timerange,
  });

  const rules = useMemo(() => {
    const lastRiskItem = data && data.length > 0 ? data[data.length - 1] : null;
    if (lastRiskItem) {
      return riskEntity === RiskScoreEntity.host
        ? (lastRiskItem as HostRiskScore).host.risk.rule_risks
        : (lastRiskItem as UserRiskScore).user.risk.rule_risks;
    }
    return [];
  }, [data, riskEntity]);

  useQueryInspector({
    queryId,
    loading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  const toggleContributorsQuery = useCallback(
    (status: boolean) => {
      setContributorsToggleStatus(status);
    },
    [setContributorsToggleStatus]
  );

  const toggleOverTimeQuery = useCallback(
    (status: boolean) => {
      setOverTimeToggleStatus(status);
    },
    [setOverTimeToggleStatus]
  );

  const status = {
    isDisabled: !isModuleEnabled && !loading,
    isDeprecated: isDeprecated && !loading,
  };

  if (status.isDisabled || status.isDeprecated) {
    return (
      <EnableRiskScore
        {...status}
        entityType={riskEntity}
        refetch={refetch}
        timerange={timerange}
      />
    );
  }

  if (isModuleEnabled && severitySelectionRedux.length === 0 && data && data.length === 0) {
    return <RiskScoresNoDataDetected entityType={riskEntity} refetch={refetch} />;
  }

  return (
    <>
      <EuiFlexGroup direction="row">
        <EuiFlexItem grow={2}>
          <RiskScoreOverTime
            from={startDate}
            to={endDate}
            loading={loading}
            riskScore={data}
            queryId={queryId}
            title={i18n.RISK_SCORE_OVER_TIME(riskEntity)}
            toggleStatus={overTimeToggleStatus}
            toggleQuery={toggleOverTimeQuery}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <TopRiskScoreContributors
            loading={loading}
            queryId={queryId}
            toggleStatus={contributorsToggleStatus}
            toggleQuery={toggleContributorsQuery}
            rules={rules}
          />
        </EuiFlexItem>
      </EuiFlexGroup>

      <StyledEuiFlexGroup gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiButton
            href={buttonHref}
            isDisabled={!buttonHref}
            data-test-subj={`risky-${riskEntity}s-view-dashboard-button`}
            target="_blank"
          >
            {i18n.VIEW_DASHBOARD_BUTTON}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RiskInformationButtonEmpty riskEntity={riskEntity} />
        </EuiFlexItem>
      </StyledEuiFlexGroup>
    </>
  );
};

RiskDetailsTabBodyComponent.displayName = 'RiskDetailsTabBodyComponent';

export const RiskDetailsTabBody = React.memo(RiskDetailsTabBodyComponent);

RiskDetailsTabBody.displayName = 'RiskDetailsTabBody';
