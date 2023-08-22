/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { v4 as uuid } from 'uuid';
import {
  EuiTitle,
  EuiSpacer,
  EuiInMemoryTable,
  EuiText,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiPanel,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import type { RelatedHost } from '../../../../common/search_strategy/security_solution/related_entities/related_hosts';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { UserOverview } from '../../../overview/components/user_overview';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { NetworkDetailsLink } from '../../../common/components/links';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { RiskScore } from '../../../explore/components/risk_score/severity/common';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/field_renderers';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../common/components/cell_actions';
import { InputsModelId } from '../../../common/store/inputs/constants';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { manageQuery } from '../../../common/components/page/manage_query';
import { useObservedUserDetails } from '../../../explore/users/containers/users/observed_details';
import { useUserRelatedHosts } from '../../../common/containers/related_entities/related_hosts';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID, USER_DETAILS_TEST_ID } from './test_ids';
import { ENTITY_RISK_CLASSIFICATION } from '../../../explore/components/risk_score/translations';
import { HOST_RISK_TOOLTIP } from '../../../explore/hosts/components/hosts_table/translations';
import * as i18n from './translations';
import { useHasSecurityCapability } from '../../../helper_hooks';

const USER_DETAILS_ID = 'entities-users-details';
const RELATED_HOSTS_ID = 'entities-users-related-hosts';

const UserOverviewManage = manageQuery(UserOverview);
const RelatedHostsManage = manageQuery(InspectButtonContainer);

export interface UserDetailsProps {
  /**
   * User name for the entities details
   */
  userName: string;
  /**
   * timestamp of alert or event
   */
  timestamp: string;
}
/**
 * User details and related users, displayed in the document details expandable flyout left section under the Insights tab, Entities tab
 */
export const UserDetails: React.FC<UserDetailsProps> = ({ userName, timestamp }) => {
  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();
  const dispatch = useDispatch();
  // create a unique, but stable (across re-renders) query id
  const userDetailsQueryId = useMemo(() => `${USER_DETAILS_ID}-${uuid()}`, []);
  const relatedHostsQueryId = useMemo(() => `${RELATED_HOSTS_ID}-${uuid()}`, []);

  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;
  const isEntityAnalyticsAuthorized = isPlatinumOrTrialLicense && hasEntityAnalyticsCapability;

  const narrowDateRange = useCallback(
    (score, interval) => {
      const fromTo = scoreIntervalToDateTime(score, interval);
      dispatch(
        setAbsoluteRangeDatePicker({
          id: InputsModelId.global,
          from: fromTo.from,
          to: fromTo.to,
        })
      );
    },
    [dispatch]
  );

  const [isUserLoading, { inspect, userDetails, refetch }] = useObservedUserDetails({
    id: userDetailsQueryId,
    startDate: from,
    endDate: to,
    userName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const {
    loading: isRelatedHostLoading,
    inspect: inspectRelatedHosts,
    relatedHosts,
    totalCount,
    refetch: refetchRelatedHosts,
  } = useUserRelatedHosts({
    userName,
    indexNames: selectedPatterns,
    from: timestamp, // related hosts are hosts this user has successfully authenticated onto AFTER alert time
    skip: selectedPatterns.length === 0,
  });

  const relatedHostsColumns: Array<EuiBasicTableColumn<RelatedHost>> = useMemo(
    () => [
      {
        field: 'host',
        name: i18n.RELATED_ENTITIES_NAME_COLUMN_TITLE,
        render: (host: string) => (
          <EuiText grow={false} size="xs">
            <SecurityCellActions
              mode={CellActionsMode.HOVER_RIGHT}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              data={{
                value: host,
                field: 'host.name',
              }}
            >
              {host}
            </SecurityCellActions>
          </EuiText>
        ),
      },
      {
        field: 'ip',
        name: i18n.RELATED_ENTITIES_IP_COLUMN_TITLE,
        render: (ips: string[]) => {
          return (
            <DefaultFieldRenderer
              rowItems={ips}
              attrName={'host.ip'}
              idPrefix={''}
              isDraggable={false}
              render={(ip) => (ip != null ? <NetworkDetailsLink ip={ip} /> : getEmptyTagValue())}
            />
          );
        },
      },
      ...(isEntityAnalyticsAuthorized
        ? [
            {
              field: 'risk',
              name: (
                <EuiToolTip content={HOST_RISK_TOOLTIP}>
                  <>
                    {ENTITY_RISK_CLASSIFICATION(RiskScoreEntity.host)}{' '}
                    <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
                  </>
                </EuiToolTip>
              ),
              truncateText: false,
              mobileOptions: { show: true },
              sortable: false,
              render: (riskScore: RiskSeverity) => {
                if (riskScore != null) {
                  return <RiskScore severity={riskScore} />;
                }
                return getEmptyTagValue();
              },
            },
          ]
        : []),
    ],
    [isEntityAnalyticsAuthorized]
  );

  const relatedHostsCount = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiIcon type="storage" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <EuiText>{`${i18n.RELATED_HOSTS_TITLE}: ${totalCount}`}</EuiText>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    [totalCount]
  );

  const pagination: {} = {
    pageSize: 4,
    showPerPageOptions: false,
  };

  return (
    <>
      <EuiTitle size="xs">
        <h4>{i18n.USER_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpandablePanel
        header={{
          title: userName,
          iconType: 'user',
          headerContent: relatedHostsCount,
        }}
        expand={{
          expandable: true,
          expandedOnFirstRender: true,
        }}
        data-test-subj={USER_DETAILS_TEST_ID}
      >
        <EuiTitle size="xxs">
          <h5>{i18n.USERS_INFO_TITLE}</h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <AnomalyTableProvider
          criteriaFields={hostToCriteria(userDetails)}
          startDate={from}
          endDate={to}
          skip={isInitializing}
        >
          {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
            <UserOverviewManage
              id={userDetailsQueryId}
              isInDetailsSidePanel={false}
              data={userDetails}
              anomaliesData={anomaliesData}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              loading={isUserLoading}
              startDate={from}
              endDate={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              refetch={refetch}
              inspect={inspect}
              userName={userName}
              indexPatterns={selectedPatterns}
              jobNameById={jobNameById}
            />
          )}
        </AnomalyTableProvider>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true}>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>{i18n.RELATED_HOSTS_TITLE}</h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.RELATED_HOSTS_TOOL_TIP}>
                <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <RelatedHostsManage
            id={relatedHostsQueryId}
            inspect={inspectRelatedHosts}
            loading={isRelatedHostLoading}
            setQuery={setQuery}
            deleteQuery={deleteQuery}
            refetch={refetchRelatedHosts}
          >
            <EuiInMemoryTable
              columns={relatedHostsColumns}
              items={relatedHosts}
              loading={isRelatedHostLoading}
              data-test-subj={USER_DETAILS_RELATED_HOSTS_TABLE_TEST_ID}
              pagination={pagination}
            />
            <InspectButton
              queryId={relatedHostsQueryId}
              title={i18n.RELATED_HOSTS_TITLE}
              inspectIndex={0}
            />
          </RelatedHostsManage>
        </EuiPanel>
      </ExpandablePanel>
    </>
  );
};
