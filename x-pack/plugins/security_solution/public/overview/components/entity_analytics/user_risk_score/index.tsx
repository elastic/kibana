/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiLink,
  EuiPanel,
  EuiToolTip,
} from '@elastic/eui';
import { useDispatch } from 'react-redux';
import styled from 'styled-components';
import { SeverityFilterGroup } from '../../../../common/components/severity/severity_filter_group';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { LastUpdatedAt } from '../../detection_response/utils';
import { HeaderSection } from '../../../../common/components/header_section';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { SecurityPageName } from '../../../../app/types';
import * as i18n from './translations';
import { generateSeverityFilter } from '../../../../hosts/store/helpers';

import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { usersActions } from '../../../../users/store';
import { getUserRiskScoreColumns } from './columns';
import { useUserRiskScore, useUserRiskScoreKpi } from '../../../../risk_score/containers';
import { UsersTableType } from '../../../../users/store/model';
import { getTabsOnUsersUrl } from '../../../../common/components/link_to/redirect_to_users';
import { RISKY_USERS_DOC_LINK } from '../../../../users/components/constants';
import { RiskScoreDonutChart } from '../common/risk_score_donut_chart';
import { BasicTableWithoutBorderBottom } from '../common/basic_table_without_border_bottom';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';

import type { inputsModel } from '../../../../common/store';
import { useCheckSignalIndex } from '../../../../detections/containers/detection_engine/alerts/use_check_signal_index';
import { useEnableRiskScoreViaDevTools } from '../../../../common/hooks/use_enable_risk_score_via_dev_tools';
import { RiskyScoreRestartButton } from '../common/risky_score_restart_button';
import { RiskScoreModuleName } from '../common/utils';
import { RiskyScoreEnableButton } from '../common/risky_score_enable_button';

const TABLE_QUERY_ID = 'userRiskDashboardTable';

const IconWrapper = styled.span`
  margin-left: ${({ theme }) => theme.eui.euiSizeS};
`;

export const EntityAnalyticsUserRiskScores = () => {
  const { deleteQuery, setQuery } = useGlobalTime();
  const [updatedAt, setUpdatedAt] = useState<number>(Date.now());
  const { toggleStatus, setToggleStatus } = useQueryToggle(TABLE_QUERY_ID);
  const columns = useMemo(() => getUserRiskScoreColumns(), []);
  const [selectedSeverity, setSelectedSeverity] = useState<RiskSeverity[]>([]);
  const getSecuritySolutionLinkProps = useGetSecuritySolutionLinkProps();
  const dispatch = useDispatch();
  const riskyUsersFeatureEnabled = useIsExperimentalFeatureEnabled('riskyUsersEnabled');

  const severityFilter = useMemo(() => {
    const [filter] = generateSeverityFilter(selectedSeverity, RiskScoreEntity.user);

    return filter ? JSON.stringify(filter.query) : undefined;
  }, [selectedSeverity]);

  const { severityCount, loading: isKpiLoading } = useUserRiskScoreKpi({
    filterQuery: severityFilter,
    skip: !toggleStatus,
  });

  const [isTableLoading, { data, inspect, refetch, isModuleEnabled }] = useUserRiskScore({
    filterQuery: severityFilter,
    skip: !toggleStatus,
    pagination: {
      cursorStart: 0,
      querySize: 5,
    },
  });

  useQueryInspector({
    queryId: TABLE_QUERY_ID,
    loading: isTableLoading,
    refetch,
    setQuery,
    deleteQuery,
    inspect,
  });

  useEffect(() => {
    setUpdatedAt(Date.now());
  }, [isTableLoading, isKpiLoading]); // Update the time when data loads

  const [goToUserRiskTab, userRiskTabUrl] = useMemo(() => {
    const { onClick, href } = getSecuritySolutionLinkProps({
      deepLinkId: SecurityPageName.users,
      path: getTabsOnUsersUrl(UsersTableType.risk),
      onClick: () => {
        dispatch(
          usersActions.updateUserRiskScoreSeverityFilter({
            severitySelection: [],
          })
        );
      },
    });
    return [onClick, href];
  }, [dispatch, getSecuritySolutionLinkProps]);

  const headerTitle = useMemo(() => {
    return (
      <>
        {i18n.USER_RISK_TITLE}
        <IconWrapper>
          <EuiIconTip
            color="subdued"
            content={i18n.USER_RISK_TABLE_TOOLTIP}
            position="right"
            size="l"
            type="iInCircle"
          />
        </IconWrapper>
      </>
    );
  }, []);

  if (!riskyUsersFeatureEnabled) {
    return null;
  }

  if (!isModuleEnabled && !isTableLoading) {
    return <EntityAnalyticsUserRiskScoresDisable refetch={refetch} />;
  }

  return (
    <InspectButtonContainer>
      <EuiPanel hasBorder data-test-subj="entity_analytics_users">
        <HeaderSection
          title={headerTitle}
          titleSize="s"
          subtitle={
            <LastUpdatedAt
              isUpdating={isTableLoading || isKpiLoading}
              updatedAt={updatedAt}
              refresh={refetch}
            />
          }
          id={TABLE_QUERY_ID}
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
        >
          {toggleStatus && (
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <RiskyScoreRestartButton refetch={refetch} moduleName={RiskScoreModuleName.User} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonEmpty href={RISKY_USERS_DOC_LINK} target="_blank">
                  {i18n.LEARN_MORE}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <SeverityFilterGroup
                  selectedSeverities={selectedSeverity}
                  severityCount={severityCount}
                  title={i18n.USER_RISK}
                  onSelect={setSelectedSeverity}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <LinkButton
                  data-test-subj="view-all-button"
                  onClick={goToUserRiskTab}
                  href={userRiskTabUrl}
                >
                  {i18n.VIEW_ALL}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          )}
        </HeaderSection>
        {toggleStatus && (
          <EuiFlexGroup data-test-subj="entity_analytics_content">
            <EuiFlexItem grow={false}>
              <RiskScoreDonutChart
                severityCount={severityCount}
                onClick={goToUserRiskTab}
                href={userRiskTabUrl}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <BasicTableWithoutBorderBottom
                responsive={false}
                items={data ?? []}
                columns={columns}
                loading={isTableLoading}
                id={TABLE_QUERY_ID}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

const EntityAnalyticsUserRiskScoresDisable = ({ refetch }: { refetch: inputsModel.Refetch }) => {
  const { signalIndexExists } = useCheckSignalIndex();
  const enableViaDevToolsUrl = useEnableRiskScoreViaDevTools(RiskScoreModuleName.User);

  return (
    <EuiPanel hasBorder>
      <HeaderSection title={<h2>{i18n.USER_RISK_TITLE}</h2>} titleSize="s" />
      <EuiEmptyPrompt
        title={<h2>{i18n.ENABLE_USER_RISK_SCORE}</h2>}
        body={
          <>
            {i18n.ENABLE_USER_RISK_SCORE_DESCRIPTION}{' '}
            <EuiLink href={RISKY_USERS_DOC_LINK} target="_blank" external>
              {i18n.LEARN_MORE}
            </EuiLink>
          </>
        }
        actions={
          <EuiFlexGroup alignItems="center" justifyContent="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
                <EuiButtonEmpty
                  href={enableViaDevToolsUrl}
                  isDisabled={!signalIndexExists}
                  data-test-subj="enable_user_risk_score_via_devtools"
                >
                  {i18n.ENABLE_VIA_DEV_TOOLS}
                </EuiButtonEmpty>
              </EuiToolTip>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={!signalIndexExists ? i18n.ENABLE_RISK_SCORE_POPOVER : null}>
                <RiskyScoreEnableButton
                  refetch={refetch}
                  moduleName={RiskScoreModuleName.User}
                  disabled={!signalIndexExists}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    </EuiPanel>
  );
};
