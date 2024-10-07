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
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { ExpandablePanel } from '@kbn/security-solution-common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import type { RelatedUser } from '../../../../../common/search_strategy/security_solution/related_entities/related_users';
import type { RiskSeverity } from '../../../../../common/search_strategy';
import { HostOverview } from '../../../../overview/components/host_overview';
import { AnomalyTableProvider } from '../../../../common/components/ml/anomaly/anomaly_table_provider';
import { InspectButton, InspectButtonContainer } from '../../../../common/components/inspect';
import { NetworkDetailsLink } from '../../../../common/components/links';
import { RiskScoreEntity } from '../../../../../common/search_strategy';
import { RiskScoreLevel } from '../../../../entity_analytics/components/severity/common';
import { DefaultFieldRenderer } from '../../../../timelines/components/field_renderers/default_renderer';
import { InputsModelId } from '../../../../common/store/inputs/constants';
import { CellActions } from '../../shared/components/cell_actions';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useSourcererDataView } from '../../../../sourcerer/containers';
import { manageQuery } from '../../../../common/components/page/manage_query';
import { scoreIntervalToDateTime } from '../../../../common/components/ml/score/score_interval_to_datetime';
import { setAbsoluteRangeDatePicker } from '../../../../common/store/inputs/actions';
import { hostToCriteria } from '../../../../common/components/ml/criteria/host_to_criteria';
import { useHostDetails } from '../../../../explore/hosts/containers/hosts/details';
import { useHostRelatedUsers } from '../../../../common/containers/related_entities/related_users';
import { useMlCapabilities } from '../../../../common/components/ml/hooks/use_ml_capabilities';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import {
  HOST_DETAILS_TEST_ID,
  HOST_DETAILS_RELATED_USERS_TABLE_TEST_ID,
  HOST_DETAILS_RELATED_USERS_LINK_TEST_ID,
  HOST_DETAILS_RELATED_USERS_IP_LINK_TEST_ID,
} from './test_ids';
import {
  USER_NAME_FIELD_NAME,
  HOST_IP_FIELD_NAME,
} from '../../../../timelines/components/timeline/body/renderers/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { ENTITY_RISK_LEVEL } from '../../../../entity_analytics/components/risk_score/translations';
import { useHasSecurityCapability } from '../../../../helper_hooks';
import { PreviewLink } from '../../../shared/components/preview_link';
import { HostPreviewPanelKey } from '../../../entity_details/host_right';
import { HOST_PREVIEW_BANNER } from '../../right/components/host_entity_overview';
import type { NarrowDateRange } from '../../../../common/components/ml/types';

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
  /**
   * Maintain backwards compatibility // TODO remove when possible
   */
  scopeId: string;
}

/**
 * Host details and related users, displayed in the document details expandable flyout left section under the Insights tab, Entities tab
 */
export const HostDetails: React.FC<HostDetailsProps> = ({ hostName, timestamp, scopeId }) => {
  const { to, from, deleteQuery, setQuery, isInitializing } = useGlobalTime();
  const { selectedPatterns } = useSourcererDataView();
  const dispatch = useDispatch();
  const { telemetry } = useKibana().services;
  // create a unique, but stable (across re-renders) query id
  const hostDetailsQueryId = useMemo(() => `${HOST_DETAILS_ID}-${uuid()}`, []);
  const relatedUsersQueryId = useMemo(() => `${RELATED_USERS_ID}-${uuid()}`, []);
  const hasEntityAnalyticsCapability = useHasSecurityCapability('entity-analytics');
  const isPlatinumOrTrialLicense = useMlCapabilities().isPlatinumOrTrialLicense;
  const isEntityAnalyticsAuthorized = isPlatinumOrTrialLicense && hasEntityAnalyticsCapability;

  const { openPreviewPanel } = useExpandableFlyoutApi();
  const isPreviewEnabled = !useIsExperimentalFeatureEnabled('entityAlertPreviewDisabled');

  const narrowDateRange = useCallback<NarrowDateRange>(
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

  const openHostPreview = useCallback(() => {
    openPreviewPanel({
      id: HostPreviewPanelKey,
      params: {
        hostName,
        scopeId,
        banner: HOST_PREVIEW_BANNER,
      },
    });
    telemetry.reportDetailsFlyoutOpened({
      location: scopeId,
      panel: 'preview',
    });
  }, [openPreviewPanel, hostName, scopeId, telemetry]);

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
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersNameColumnLabel"
            defaultMessage="Name"
          />
        ),
        render: (user: string) => (
          <EuiText grow={false} size="xs">
            <CellActions field={USER_NAME_FIELD_NAME} value={user}>
              {isPreviewEnabled ? (
                <PreviewLink
                  field={USER_NAME_FIELD_NAME}
                  value={user}
                  scopeId={scopeId}
                  data-test-subj={HOST_DETAILS_RELATED_USERS_LINK_TEST_ID}
                />
              ) : (
                <>{user}</>
              )}
            </CellActions>
          </EuiText>
        ),
      },
      {
        field: 'ip',
        name: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersIpColumnLabel"
            defaultMessage="Ip addresses"
          />
        ),
        render: (ips: string[]) => {
          return (
            <DefaultFieldRenderer
              rowItems={ips}
              attrName={HOST_IP_FIELD_NAME}
              idPrefix={''}
              isDraggable={false}
              render={(ip) =>
                ip == null ? (
                  getEmptyTagValue()
                ) : isPreviewEnabled ? (
                  <PreviewLink
                    field={HOST_IP_FIELD_NAME}
                    value={ip}
                    scopeId={scopeId}
                    data-test-subj={HOST_DETAILS_RELATED_USERS_IP_LINK_TEST_ID}
                  />
                ) : (
                  <NetworkDetailsLink ip={ip} />
                )
              }
              scopeId={scopeId}
            />
          );
        },
      },
      ...(isEntityAnalyticsAuthorized
        ? [
            {
              field: 'risk',
              name: ENTITY_RISK_LEVEL(RiskScoreEntity.user),
              truncateText: false,
              mobileOptions: { show: true },
              sortable: false,
              render: (riskScore: RiskSeverity) => {
                if (riskScore != null) {
                  return <RiskScoreLevel severity={riskScore} />;
                }
                return getEmptyTagValue();
              },
            },
          ]
        : []),
    ],
    [isEntityAnalyticsAuthorized, scopeId, isPreviewEnabled]
  );

  const relatedUsersCount = useMemo(
    () => (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="user" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxxs">
            <EuiText>
              <FormattedMessage
                id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersCountLabel"
                defaultMessage="Related users: {count}"
                values={{ count: totalCount }}
              />
            </EuiText>
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

  const hostLink = useMemo(
    () =>
      isPreviewEnabled
        ? {
            callback: openHostPreview,
            tooltip: i18n.translate(
              'xpack.securitySolution.flyout.left.insights.entities.host.hostPreviewTitle',
              {
                defaultMessage: 'Preview host',
              }
            ),
          }
        : undefined,
    [isPreviewEnabled, openHostPreview]
  );

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.flyout.left.insights.entities.hostDetailsTitle"
            defaultMessage="Host"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <ExpandablePanel
        header={{
          title: hostName,
          iconType: 'storage',
          headerContent: relatedUsersCount,
          link: hostLink,
        }}
        expand={{ expandable: true, expandedOnFirstRender: true }}
        data-test-subj={HOST_DETAILS_TEST_ID}
      >
        <EuiTitle size="xxs">
          <h4>
            <FormattedMessage
              id="xpack.securitySolution.flyout.left.insights.entities.hostDetailsInfoTitle"
              defaultMessage="Host information"
            />
          </h4>
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
                <h4>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersTitle"
                    defaultMessage="Related users"
                  />
                </h4>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersTooltip"
                    defaultMessage="After this event, these users logged into {hostName}. Check if this activity is normal."
                    values={{ hostName }}
                  />
                }
              >
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
              message={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersNoDataDescription"
                  defaultMessage="No users identified"
                />
              }
            />
            <InspectButton
              queryId={relatedUsersQueryId}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.left.insights.entities.relatedUsersInspectButtonTitle"
                  defaultMessage="Related users"
                />
              }
              inspectIndex={0}
            />
          </RelatedUsersManage>
        </EuiPanel>
      </ExpandablePanel>
    </>
  );
};

HostDetails.displayName = 'HostDetails';
