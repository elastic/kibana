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
import {
  MANAGEMENT_PAGE_SIZE_OPTIONS,
  MANAGEMENT_DEFAULT_PAGE_SIZE,
} from '../../../../../common/constants';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import {
  usePolicyDetailsArtifactsNavigateCallback,
  usePolicyDetailsSelector,
} from '../../policy_hooks';
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { ImmutableObject, PolicyData } from '../../../../../../../common/endpoint/types';
import { isGlobalPolicyEffected } from '../../../../../components/effected_policy_select/utils';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import { useGetLinkTo } from '../empty/use_policy_artifacts_empty_hooks';
import { ExceptionsListApiClient } from '../../../../../services/exceptions_list/exceptions_list_api_client';
import { useListArtifact } from '../../../../../hooks/artifacts';
import { PolicyArtifactsDeleteModal } from '../delete_modal';
import { PolicyArtifactsPageLabels } from '../translations';
import { POLICY_ARTIFACT_LIST_LABELS } from './translations';

interface PolicyArtifactsListProps {
  policy: ImmutableObject<PolicyData>;
  apiClient: ExceptionsListApiClient;
  searcheableFields: string[];
  artifactPathFn: (location: object) => string;
  labels: typeof POLICY_ARTIFACT_LIST_LABELS & PolicyArtifactsPageLabels;
}

export const PolicyArtifactsList = React.memo<PolicyArtifactsListProps>(
  ({ policy, apiClient, searcheableFields, artifactPathFn, labels }) => {
    const { getAppUrl } = useAppUrl();
    const { canCreateArtifactsByPolicy } = useUserPrivileges().endpointPrivileges;
    const policiesRequest = useGetEndpointSpecificPolicies({ perPage: 1000 });
    const navigateCallback = usePolicyDetailsArtifactsNavigateCallback(apiClient.listId);
    const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);
    const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());
    const [exceptionItemToDelete, setExceptionItemToDelete] = useState<
      ExceptionListItemSchema | undefined
    >();
    const { state } = useGetLinkTo(policy.id, policy.name, apiClient.listId);

    const {
      data: artifacts,
      isLoading: isLoadingArtifacts,
      isRefetching: isRefetchingArtifacts,
    } = useListArtifact(apiClient, searcheableFields, {
      page: urlParams.page_index + 1 || undefined,
      perPage: urlParams.page_size || undefined,
      filter: urlParams.filter,
      policies: [policy.id, 'global'],
    });

    const pagination: Pagination = {
      pageSize: urlParams.page_size || MANAGEMENT_DEFAULT_PAGE_SIZE,
      pageIndex: urlParams.page_index || 0,
      pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
      totalItemCount: artifacts?.total || 0,
    };

    const handleOnSearch = useCallback(
      (filter) => {
        navigateCallback({ filter });
      },
      [navigateCallback]
    );

    const handleOnExpandCollapse: ArtifactCardGridProps['onExpandCollapse'] = ({
      expanded,
      collapsed,
    }) => {
      const newExpandedMap = new Map(expandedItemsMap);
      for (const item of expanded) {
        newExpandedMap.set(item.id, true);
      }
      for (const item of collapsed) {
        newExpandedMap.set(item.id, false);
      }
      setExpandedItemsMap(newExpandedMap);
    };
    const handleOnPageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
      ({ pageIndex, pageSize }) => {
        if (artifacts?.total) navigateCallback({ page_index: pageIndex, page_size: pageSize });
      },
      [artifacts?.total, navigateCallback]
    );

    const totalItemsCountLabel = useMemo<string>(() => {
      return labels.listTotalItemCountMessage(artifacts?.data.length || 0);
    }, [artifacts?.data.length, labels]);

    const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);
    const provideCardProps: ArtifactCardGridProps['cardComponentProps'] = (artifact) => {
      const viewUrlPath = artifactPathFn({
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
          setExceptionItemToDelete(item);
        },
        disabled: isGlobal,
        toolTipContent: isGlobal ? labels.listRemoveActionNotAllowedMessage : undefined,
        toolTipPosition: 'top' as const,
        'data-test-subj': 'remove-from-policy-action',
      };
      return {
        expanded: expandedItemsMap.get(item.id) || false,
        actions: canCreateArtifactsByPolicy
          ? [fullDetailsAction, deleteAction]
          : [fullDetailsAction],
        policies: artifactCardPolicies,
      };
    };

    const handleDeleteModalClose = useCallback(() => {
      setExceptionItemToDelete(undefined);
    }, [setExceptionItemToDelete]);

    return (
      <>
        {exceptionItemToDelete && (
          <PolicyArtifactsDeleteModal
            policyId={policy.id}
            policyName={policy.name}
            apiClient={apiClient}
            exception={exceptionItemToDelete}
            onCancel={handleDeleteModalClose}
            labels={labels}
          />
        )}
        <SearchExceptions
          placeholder={labels.listSearchPlaceholderMessage}
          defaultValue={urlParams.filter}
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
