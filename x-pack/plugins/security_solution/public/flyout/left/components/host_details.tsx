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
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import type { RelatedUser } from '../../../../common/search_strategy/security_solution/related_entities/related_users';
import type { RiskSeverity } from '../../../../common/search_strategy';
import { HostOverview } from '../../../overview/components/host_overview';
import { AnomalyTableProvider } from '../../../common/components/ml/anomaly/anomaly_table_provider';
import { InspectButton, InspectButtonContainer } from '../../../common/components/inspect';
import { NetworkDetailsLink } from '../../../common/components/links';
import { RiskScoreEntity } from '../../../../common/search_strategy';
import { RiskScore } from '../../../explore/components/risk_score/severity/common';
import { DefaultFieldRenderer } from '../../../timelines/components/field_renderers/field_renderers';
import { InputsModelId } from '../../../common/store/inputs/constants';
import {
  SecurityCellActions,
  CellActionsMode,
  SecurityCellActionsTrigger,
} from '../../../common/components/cell_actions';
import { useGlobalTime } from '../../../common/containers/use_global_time';
import { useSourcererDataView } from '../../../common/containers/sourcerer';
import { manageQuery } from '../../../common/components/page/manage_query';
import { scoreIntervalToDateTime } from '../../../common/components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker } from '../../../common/store/inputs/actions';
import { hostToCriteria } from '../../../common/components/ml/criteria/host_to_criteria';
import { useHostDetails } from '../../../explore/hosts/containers/hosts/details';
import { useHostRelatedUsers } from '../../../common/containers/related_entities/related_users';
import { useMlCapabilities } from '../../../common/components/ml/hooks/use_ml_capabilities';
import { getEmptyTagValue } from '../../../common/components/empty_value';
import { HOST_DETAILS_TEST_ID, HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID } from './test_ids';
import { ENTITY_RISK_CLASSIFICATION } from '../../../explore/components/risk_score/translations';
import { USER_RISK_TOOLTIP } from '../../../explore/users/components/all_users/translations';
import * as i18n from './translations';
import { useHasSecurityCapability } from '../../../helper_hooks';

const HOST_DETAILS_ID = 'entities-hosts-details';
const RELATED_USERS_ID = 'entities-hosts-related-users';

const HostOverviewManage = manageQuery(HostOverview);
const RelatedUsersManage = manageQuery(InspectButtonContainer);

export interface HostDetailsProps {
  /**
   * Host name for the entities details
   */
  hostName: string;
  /**
   * timestamp of alert or event
   */
  timestamp: string;
}
/**
 * Host details and related users, displayed in the document details expandable flyout left section under the Insights tab, Entities tab
 */
export const HostDetails: React.FC<HostDetailsProps> = ({ hostName, timestamp }) => {
  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();
  const dispatch = useDispatch();
  // create a unique, but stable (across re-renders) query id
  const hostDetailsQueryId = useMemo(() => `${HOST_DETAILS_ID}-${uuid()}`, []);
  const relatedUsersQueryId = useMemo(() => `${RELATED_USERS_ID}-${uuid()}`, []);
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

  const [isHostLoading, { inspect, hostDetails, refetch }] = useHostDetails({
    id: hostDetailsQueryId,
    startDate: from,
    endDate: to,
    hostName,
    indexNames: selectedPatterns,
    skip: selectedPatterns.length === 0,
  });

  const {
    loading: isRelatedUsersLoading,
    inspect: inspectRelatedUsers,
    relatedUsers,
    totalCount,
    refetch: refetchRelatedUsers,
  } = useHostRelatedUsers({
    hostName,
    indexNames: selectedPatterns,
    from: timestamp, // related users are users who were successfully authenticated onto this host AFTER alert time
    skip: selectedPatterns.length === 0,
  });

  const relatedUsersColumns: Array<EuiBasicTableColumn<RelatedUser>> = useMemo(
    () => [
      {
        field: 'user',
        name: i18n.RELATED_ENTITIES_NAME_COLUMN_TITLE,
        render: (user: string) => (
          <EuiText grow={false} size="xs">
            <SecurityCellActions
              mode={CellActionsMode.HOVER_RIGHT}
              visibleCellActions={5}
              showActionTooltips
              triggerId={SecurityCellActionsTrigger.DEFAULT}
              data={{
                field: 'user.name',
                value: user,
              }}
            >
              {user}
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
                <EuiToolTip content={USER_RISK_TOOLTIP}>
                  <>
                    {ENTITY_RISK_CLASSIFICATION(RiskScoreEntity.user)}{' '}
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

  const relatedUsersCount = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiIcon type="user" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <EuiText>{`${i18n.RELATED_USERS_TITLE}: ${totalCount}`}</EuiText>
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
        <h4>{i18n.HOST_TITLE}</h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpandablePanel
        header={{
          title: hostName,
          iconType: 'storage',
          headerContent: relatedUsersCount,
        }}
        expand={{ expandable: true, expandedOnFirstRender: true }}
        data-test-subj={HOST_DETAILS_TEST_ID}
      >
        <EuiTitle size="xxs">
          <h5>{i18n.HOSTS_INFO_TITLE}</h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <AnomalyTableProvider
          criteriaFields={hostToCriteria(hostDetails)}
          startDate={from}
          endDate={to}
          skip={isInitializing}
        >
          {({ isLoadingAnomaliesData, anomaliesData, jobNameById }) => (
            <HostOverviewManage
              id={hostDetailsQueryId}
              hostName={hostName}
              data={hostDetails}
              indexNames={selectedPatterns}
              jobNameById={jobNameById}
              anomaliesData={anomaliesData}
              isLoadingAnomaliesData={isLoadingAnomaliesData}
              isInDetailsSidePanel={false}
              loading={isHostLoading}
              startDate={from}
              endDate={to}
              narrowDateRange={narrowDateRange}
              setQuery={setQuery}
              refetch={refetch}
              inspect={inspect}
              deleteQuery={deleteQuery}
            />
          )}
        </AnomalyTableProvider>
        <EuiSpacer size="s" />
        <EuiPanel hasBorder={true}>
          <EuiFlexGroup direction="row" gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xxs">
                <h5>{i18n.RELATED_USERS_TITLE}</h5>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.RELATED_USERS_TOOL_TIP}>
                <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <RelatedUsersManage
            id={relatedUsersQueryId}
            inspect={inspectRelatedUsers}
            loading={isRelatedUsersLoading}
            setQuery={setQuery}
            deleteQuery={deleteQuery}
            refetch={refetchRelatedUsers}
          >
            <EuiInMemoryTable
              columns={relatedUsersColumns}
              items={relatedUsers}
              loading={isRelatedUsersLoading}
              data-test-subj={HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID}
              pagination={pagination}
            />
            <InspectButton
              queryId={relatedUsersQueryId}
              title={i18n.RELATED_USERS_TITLE}
              inspectIndex={0}
            />
          </RelatedUsersManage>
        </EuiPanel>
      </ExpandablePanel>
    </>
  );
};

HostDetails.displayName = 'HostDetails';
