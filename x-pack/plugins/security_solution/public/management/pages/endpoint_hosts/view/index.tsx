/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { EuiHorizontalRule, EuiText, EuiSpacer, EuiSelectableProps, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { createStructuredSelector } from 'reselect';
import { useDispatch } from 'react-redux';
import { useHostSelector } from './hooks';
import { CreateStructuredSelector } from '../../../../common/store';
import { SpyRoute } from '../../../../common/utils/route/spy_routes';
import { PolicyEmptyState, HostsEmptyState } from '../../../components/management_empty_state';
import { useNavigateToAppEventHandler } from '../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import {
  CreatePackageConfigRouteState,
  AgentConfigDetailsDeployAgentAction,
} from '../../../../../../ingest_manager/public';
import { SecurityPageName } from '../../../../app/types';
import { getHostListPath } from '../../../common/routing';
import { useFormatUrl } from '../../../../common/components/link_to';
import { WrapperPage } from '../../../../common/components/wrapper_page';
import { HeaderPage } from '../../../../common/components/header_page';
import { SiemNavigation } from '../../../../common/components/navigation';
import { managementTabs } from '../../../components/management_tabs';
import * as selectors from '../store/selectors';
import { HostAction } from '../store/action';
import { HostDetailsFlyout } from './details';
import { HostList } from './host_list';

const selector = (createStructuredSelector as CreateStructuredSelector)(selectors);

export const HostListPage = () => {
  const {
    listData,
    pageIndex,
    pageSize,
    totalHits: totalItemCount,
    listLoading: loading,
    listError,
    uiQueryParams: queryParams,
    hasSelectedHost,
    policyItems,
    selectedPolicyId,
    policyItemsLoading,
    endpointPackageVersion,
  } = useHostSelector(selector);
  const { formatUrl } = useFormatUrl(SecurityPageName.administration);

  const dispatch = useDispatch<(a: HostAction) => void>();

  const handleCreatePolicyClick = useNavigateToAppEventHandler<CreatePackageConfigRouteState>(
    'ingestManager',
    {
      path: `#/integrations${
        endpointPackageVersion ? `/endpoint-${endpointPackageVersion}/add-integration` : ''
      }`,
      state: {
        onCancelNavigateTo: [
          'securitySolution:administration',
          { path: getHostListPath({ name: 'hostList' }) },
        ],
        onCancelUrl: formatUrl(getHostListPath({ name: 'hostList' })),
        onSaveNavigateTo: [
          'securitySolution:administration',
          { path: getHostListPath({ name: 'hostList' }) },
        ],
      },
    }
  );

  const handleDeployEndpointsClick = useNavigateToAppEventHandler<
    AgentConfigDetailsDeployAgentAction
  >('ingestManager', {
    path: `#/configs/${selectedPolicyId}?openEnrollmentFlyout=true`,
    state: {
      onDoneNavigateTo: [
        'securitySolution:administration',
        { path: getHostListPath({ name: 'hostList' }) },
      ],
    },
  });

  const selectionOptions = useMemo<EuiSelectableProps['options']>(() => {
    return policyItems.map((item) => {
      return {
        key: item.config_id,
        label: item.name,
        checked: selectedPolicyId === item.config_id ? 'on' : undefined,
      };
    });
  }, [policyItems, selectedPolicyId]);

  const handleSelectableOnChange = useCallback<(o: EuiSelectableProps['options']) => void>(
    (changedOptions) => {
      return changedOptions.some((option) => {
        if ('checked' in option && option.checked === 'on') {
          dispatch({
            type: 'userSelectedEndpointPolicy',
            payload: {
              selectedPolicyId: option.key as string,
            },
          });
          return true;
        } else {
          return false;
        }
      });
    },
    [dispatch]
  );

  const renderTableOrEmptyState = useMemo(() => {
    if (!loading && listData && listData.length > 0) {
      return (
        <>
          <EuiText color="subdued" size="xs" data-test-subj="hostListTableTotal">
            <FormattedMessage
              id="xpack.securitySolution.endpointList.totalCount"
              defaultMessage="{totalItemCount, plural, one {# Host} other {# Hosts}}"
              values={{ totalItemCount }}
            />
          </EuiText>

          <EuiHorizontalRule margin="xs" />

          <HostList
            items={[...listData]}
            pageIndex={pageIndex}
            pageSize={pageSize}
            totalItemCount={totalItemCount}
            error={listError?.message}
            queryParams={queryParams}
          />
        </>
      );
    } else if (!policyItemsLoading && policyItems && policyItems.length > 0) {
      return (
        <HostsEmptyState
          loading={loading}
          onActionClick={handleDeployEndpointsClick}
          actionDisabled={selectedPolicyId === undefined}
          handleSelectableOnChange={handleSelectableOnChange}
          selectionOptions={selectionOptions}
        />
      );
    } else {
      return (
        <PolicyEmptyState loading={policyItemsLoading} onActionClick={handleCreatePolicyClick} />
      );
    }
  }, [
    listData,
    pageIndex,
    pageSize,
    policyItems,
    totalItemCount,
    listError?.message,
    queryParams,
    loading,
    handleCreatePolicyClick,
    handleDeployEndpointsClick,
    handleSelectableOnChange,
    selectedPolicyId,
    selectionOptions,
    policyItemsLoading,
  ]);

  return (
    <WrapperPage noTimeline data-test-subj="hostPage">
      <HeaderPage
        title={
          <FormattedMessage id="xpack.securitySolution.hostList.pageTitle" defaultMessage="Hosts" />
        }
        subtitle={
          <FormattedMessage
            id="xpack.securitySolution.hostList.pageSubTitle"
            defaultMessage="Hosts running Elastic Endpoint Security"
          />
        }
        badgeOptions={{
          beta: true,
          text: i18n.translate('xpack.securitySolution.endpoint.hostList.beta', {
            defaultMessage: 'Beta',
          }),
        }}
      />

      <SiemNavigation navTabs={managementTabs} />

      <EuiSpacer />

      <EuiPanel>
        {hasSelectedHost && <HostDetailsFlyout />}
        {renderTableOrEmptyState}
        <SpyRoute pageName={SecurityPageName.administration} />
      </EuiPanel>
    </WrapperPage>
  );
};
