/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { EnableRiskScore } from '../enable_risk_score';
import { useDeepEqualSelector } from '../../../common/hooks/use_selector';
import type { State } from '../../../common/store';
import { hostsModel, hostsSelectors } from '../../../hosts/store';
import { usersSelectors } from '../../../users/store';
import { RiskInformationButtonEmpty } from '../risk_information';
import * as i18n from './translations';

import { useQueryInspector } from '../../../common/components/page/manage_query';
import { RiskScoreOverTime } from '../risk_score_over_time';
import { TopRiskScoreContributors } from '../../../common/components/top_risk_score_contributors';
import { useQueryToggle } from '../../../common/containers/query_toggle';
import {
  HostRiskScoreQueryId,
  useHostRiskScore,
  UserRiskScoreQueryId,
  useUserRiskScore,
} from '../../containers';
import type { HostRiskScore, UserRiskScore } from '../../../../common/search_strategy';
import { RiskScoreEntity, buildEntityNameFilter } from '../../../../common/search_strategy';
import type { UsersComponentsQueryProps } from '../../../users/pages/navigation/types';
import type { HostsComponentsQueryProps } from '../../../hosts/pages/navigation/types';
import { useDashboardButtonHref } from '../../../common/hooks/use_dashboard_button_href';
import { RiskScoresNoDataDetected } from '../risk_score_onboarding/risk_score_no_data_detected';

const StyledEuiFlexGroup = styled(EuiFlexGroup)`
  margin-top: ${({ theme }) => theme.eui.euiSizeL};
`;

type ComponentsQueryProps = HostsComponentsQueryProps | UsersComponentsQueryProps;

const RiskTabBodyComponent: React.FC<
  Pick<ComponentsQueryProps, 'startDate' | 'endDate' | 'setQuery' | 'deleteQuery'> & {
    entityName: string;
    riskEntity: RiskScoreEntity;
  }
> = ({ entityName, startDate, endDate, setQuery, deleteQuery, riskEntity }) => {
  const entity = useMemo(
    () =>
      riskEntity === RiskScoreEntity.host
        ? {
            queryId: HostRiskScoreQueryId.HOST_DETAILS_RISK_SCORE,
            riskScoreHook: useHostRiskScore,
          }
        : {
            queryId: UserRiskScoreQueryId.USER_DETAILS_RISK_SCORE,
            riskScoreHook: useUserRiskScore,
          },
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
    title: i18n.RISKY_DASHBOARD_TITLE(riskEntity),
  });

  const timerange = useMemo(
    () => ({
      from: startDate,
      to: endDate,
    }),
    [startDate, endDate]
  );

  const { toggleStatus: overTimeToggleStatus, setToggleStatus: setOverTimeToggleStatus } =
    useQueryToggle(`${entity.queryId} overTime`);
  const { toggleStatus: contributorsToggleStatus, setToggleStatus: setContributorsToggleStatus } =
    useQueryToggle(`${entity.queryId} contributors`);

  const filterQuery = useMemo(
    () => (entityName ? buildEntityNameFilter([entityName], riskEntity) : {}),
    [entityName, riskEntity]
  );
  const [loading, { data, refetch, inspect, isDeprecated, isModuleEnabled }] = entity.riskScoreHook(
    {
      filterQuery,
      onlyLatest: false,
      skip: !overTimeToggleStatus && !contributorsToggleStatus,
      timerange,
    }
  );

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
    queryId: entity.queryId,
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
            queryId={entity.queryId}
            title={i18n.RISK_SCORE_OVER_TIME(riskEntity)}
            toggleStatus={overTimeToggleStatus}
            toggleQuery={toggleOverTimeQuery}
          />
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <TopRiskScoreContributors
            loading={loading}
            queryId={entity.queryId}
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

RiskTabBodyComponent.displayName = 'RiskTabBodyComponent';

export const RiskTabBody = React.memo(RiskTabBodyComponent);

RiskTabBody.displayName = 'RiskTabBody';
