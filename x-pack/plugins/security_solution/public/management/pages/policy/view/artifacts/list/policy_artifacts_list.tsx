/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiSpacer, EuiText, Pagination } from '@elastic/eui';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { useEndpointPoliciesToArtifactPolicies } from '../../../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { useUrlParams } from '../../../../../components/hooks/use_url_params';
import { useUrlPagination } from '../../../../../components/hooks/use_url_pagination';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import { useOldUrlSearchPaginationReplace } from '../../../../../components/hooks/use_old_url_search_pagination_replace';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { usePolicyDetailsArtifactsNavigateCallback } from '../../policy_hooks';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { isGlobalPolicyEffected } from '../../../../../components/effected_policy_select/utils';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useGetLinkTo } from '../empty/use_policy_artifacts_empty_hooks';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { useListArtifact } from '../../../../../hooks/artifacts';
import { POLICY_ARTIFACT_LIST_LABELS } from './translations';
import { EventFiltersPageLocation } from '../../../../event_filters/types';
import { TrustedAppsListPageLocation } from '../../../../trusted_apps/state';
import { ArtifactListPageUrlParams } from '../../../../../components/artifact_list_page';

interface PolicyArtifactsListProps {
  policy: ImmutableObject<PolicyData>;
  apiClient: ExceptionsListApiClient;
  searchableFields: string[];
  getArtifactPath: (
    location?:
      | Partial<EventFiltersPageLocation>
      | Partial<TrustedAppsListPageLocation>
      | Partial<ArtifactListPageUrlParams>
  ) => string;
  getPolicyArtifactsPath: (policyId: string) => string;
  labels: typeof POLICY_ARTIFACT_LIST_LABELS;
  onDeleteActionCallback: (item: ExceptionListItemSchema) => void;
  externalPrivileges?: boolean;
}

export const PolicyArtifactsList = React.memo<PolicyArtifactsListProps>(
  ({
    policy,
    apiClient,
    searchableFields,
    getArtifactPath,
    getPolicyArtifactsPath,
    labels,
    onDeleteActionCallback,
    externalPrivileges = true,
  }) => {
    useOldUrlSearchPaginationReplace();
    const { getAppUrl } = useAppUrl();
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const policiesRequest = useGetEndpointSpecificPolicies({ perPage: 1000 });
    const navigateCallback = usePolicyDetailsArtifactsNavigateCallback(apiClient.listId);
    const { urlParams } = useUrlParams();
    const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());

    const { state } = useGetLinkTo(policy.id, policy.name, getPolicyArtifactsPath, getArtifactPath);

    const { pageSizeOptions, pagination: urlPagination, setPagination } = useUrlPagination();

    const {
      data: artifacts,
      isLoading: isLoadingArtifacts,
      isRefetching: isRefetchingArtifacts,
    } = useListArtifact(
      apiClient,
      {
        page: urlPagination.page,
        perPage: urlPagination.pageSize,
        filter: urlParams.filter as string,
        policies: [policy.id, 'all'],
      },
      searchableFields
    );

    const pagination: Pagination = useMemo(
      () => ({
        pageSize: urlPagination.pageSize,
        pageIndex: urlPagination.page - 1,
        pageSizeOptions,
        totalItemCount: artifacts?.total || 0,
      }),
      [artifacts?.total, pageSizeOptions, urlPagination.page, urlPagination.pageSize]
    );

    const handleOnSearch = useCallback(
      (filter) => {
        navigateCallback({ filter });
      },
      [navigateCallback]
    );

    const handleOnExpandCollapse = useCallback<ArtifactCardGridProps['onExpandCollapse']>(
      ({ expanded, collapsed }) => {
        const newExpandedMap = new Map(expandedItemsMap);
        for (const item of expanded) {
          newExpandedMap.set(item.id, true);
        }
        for (const item of collapsed) {
          newExpandedMap.set(item.id, false);
        }
        setExpandedItemsMap(newExpandedMap);
      },
      [expandedItemsMap]
    );
    const handleOnPageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
      ({ pageIndex, pageSize }) => {
        if (artifacts?.total) setPagination({ page: pageIndex + 1, pageSize });
      },
      [artifacts?.total, setPagination]
    );

    const totalItemsCountLabel = useMemo<string>(() => {
      return labels.listTotalItemCountMessage(artifacts?.data.length || 0);
    }, [artifacts?.data.length, labels]);

    const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);
    const provideCardProps = useCallback(
      (artifact) => {
        const viewUrlPath = getArtifactPath({
          filter: (artifact as ExceptionListItemSchema).item_id,
        });
        const fullDetailsAction = {
          icon: 'controlsHorizontal',
          children: labels.listFullDetailsActionTitle,
          href: getAppUrl({ appId: APP_UI_ID, path: viewUrlPath }),
          navigateAppId: APP_UI_ID,
          navigateOptions: { path: viewUrlPath, state },
          'data-test-subj': 'view-full-details-action',
        };
        const item = artifact as ExceptionListItemSchema;

        const isGlobal = isGlobalPolicyEffected(item.tags);
        const deleteAction = {
          icon: 'trash',
          children: labels.listRemoveActionTitle,
          onClick: () => {
            onDeleteActionCallback(item);
          },
          disabled: isGlobal,
          toolTipContent: isGlobal ? labels.listRemoveActionNotAllowedMessage : undefined,
          toolTipPosition: 'top' as const,
          'data-test-subj': 'remove-from-policy-action',
        };
        return {
          expanded: expandedItemsMap.get(item.id) || false,
          actions:
            canCreateArtifactsByPolicy && externalPrivileges
              ? [fullDetailsAction, deleteAction]
              : [fullDetailsAction],
          policies: artifactCardPolicies,
        };
      },
      [
        artifactCardPolicies,
        canCreateArtifactsByPolicy,
        expandedItemsMap,
        externalPrivileges,
        getAppUrl,
        getArtifactPath,
        labels.listFullDetailsActionTitle,
        labels.listRemoveActionNotAllowedMessage,
        labels.listRemoveActionTitle,
        onDeleteActionCallback,
        state,
      ]
    );

    return (
      <>
        <SearchExceptions
          placeholder={labels.listSearchPlaceholderMessage}
          defaultValue={urlParams.filter as string}
          hideRefreshButton
          onSearch={handleOnSearch}
        />
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="xs" data-test-subj="policyDetailsArtifactsSearchCount">
          {totalItemsCountLabel}
        </EuiText>
        <EuiSpacer size="m" />
        <ArtifactCardGrid
          items={artifacts?.data || []}
          onPageChange={handleOnPageChange}
          onExpandCollapse={handleOnExpandCollapse}
          cardComponentProps={provideCardProps}
          pagination={artifacts ? pagination : undefined}
          loading={isLoadingArtifacts || isRefetchingArtifacts}
          data-test-subj={'artifacts-collapsed-list'}
        />
      </>
    );
  }
);

PolicyArtifactsList.displayName = 'PolicyArtifactsList';
