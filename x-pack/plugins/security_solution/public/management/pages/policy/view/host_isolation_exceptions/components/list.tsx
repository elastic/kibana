/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppUrl } from '../../../../../../common/lib/kibana';
import { APP_UI_ID } from '../../../../../../../common/constants';
import { useUserPrivileges } from '../../../../../../common/components/user_privileges';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../../../common/constants';
import {
  getHostIsolationExceptionsListPath,
  getPolicyHostIsolationExceptionsPath,
} from '../../../../../common/routing';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { useEndpointPoliciesToArtifactPolicies } from '../../../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { isGlobalPolicyEffected } from '../../../../../components/effected_policy_select/utils';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import { PolicyHostIsolationExceptionsDeleteModal } from './delete_modal';
import { useFetchHostIsolationExceptionsList } from '../../../../host_isolation_exceptions/view/hooks';
import { useGetLinkTo } from './use_policy_host_isolation_exceptions_empty_hooks';

export const PolicyHostIsolationExceptionsList = ({
  policyId,
  policyName,
}: {
  policyId: string;
  policyName: string;
}) => {
  const history = useHistory();
  const { getAppUrl } = useAppUrl();

  const privileges = useUserPrivileges().endpointPrivileges;
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const { state } = useGetLinkTo(policyId, policyName);

  // load the list of policies>
  const policiesRequest = useGetEndpointSpecificPolicies({ perPage: 1000 });
  const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const [exceptionItemToDelete, setExceptionItemToDelete] = useState<
    ExceptionListItemSchema | undefined
  >();

  const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());

  const policySearchedExceptionsListRequest = useFetchHostIsolationExceptionsList({
    filter: location.filter,
    page: location.page_index,
    perPage: location.page_size,
    policies: [policyId, 'all'],
  });

  const pagination = {
    totalItemCount: policySearchedExceptionsListRequest?.data?.total ?? 0,
    pageSize: policySearchedExceptionsListRequest?.data?.per_page ?? MANAGEMENT_DEFAULT_PAGE_SIZE,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    pageIndex: (policySearchedExceptionsListRequest?.data?.page ?? 1) - 1,
  };

  const handlePageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
    ({ pageIndex, pageSize }) => {
      history.push(
        getPolicyHostIsolationExceptionsPath(policyId, {
          ...urlParams,
          // If user changed page size, then reset page index back to the first page
          page_index: pageIndex,
          page_size: pageSize,
        })
      );
    },
    [history, policyId, urlParams]
  );

  const handleSearchInput = useCallback(
    (filter: string) => {
      history.push(
        getPolicyHostIsolationExceptionsPath(policyId, {
          ...urlParams,
          filter,
        })
      );
    },
    [history, policyId, urlParams]
  );

  const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);
  const provideCardProps: ArtifactCardGridProps['cardComponentProps'] = (artifact) => {
    const item = artifact as ExceptionListItemSchema;
    const isGlobal = isGlobalPolicyEffected(item.tags);
    const deleteAction = {
      icon: 'trash',
      children: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeAction',
        { defaultMessage: 'Remove from policy' }
      ),
      onClick: () => {
        setExceptionItemToDelete(item);
      },
      disabled: isGlobal,
      toolTipContent: isGlobal
        ? i18n.translate(
            'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.removeActionNotAllowed',
            {
              defaultMessage:
                'Globally applied host isolation exceptions cannot be removed from policy.',
            }
          )
        : undefined,
      toolTipPosition: 'top' as const,
      'data-test-subj': 'remove-from-policy-action',
    };
    const viewUrlPath = getHostIsolationExceptionsListPath({ filter: item.item_id });

    const fullDetailsAction = {
      icon: 'controlsHorizontal',
      children: i18n.translate(
        'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.fullDetailsAction',
        { defaultMessage: 'View full details' }
      ),
      href: getAppUrl({ appId: APP_UI_ID, path: viewUrlPath }),
      navigateAppId: APP_UI_ID,
      navigateOptions: { path: viewUrlPath, state },
      'data-test-subj': 'view-full-details-action',
    };

    return {
      expanded: expandedItemsMap.get(item.id) || false,
      actions: privileges.canIsolateHost ? [fullDetailsAction, deleteAction] : [fullDetailsAction],
      policies: artifactCardPolicies,
    };
  };

  const handleExpandCollapse: ArtifactCardGridProps['onExpandCollapse'] = ({
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

  const handleDeleteModalClose = useCallback(() => {
    setExceptionItemToDelete(undefined);
  }, [setExceptionItemToDelete]);

  const totalItemsCountLabel = useMemo<string>(() => {
    return i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.totalItemCount',
      {
        defaultMessage:
          'Showing {totalItemsCount, plural, one {# host isolation exception} other {# host isolation exceptions}}',
        values: { totalItemsCount: pagination.totalItemCount },
      }
    );
  }, [pagination.totalItemCount]);

  return (
    <>
      {exceptionItemToDelete ? (
        <PolicyHostIsolationExceptionsDeleteModal
          policyId={policyId}
          policyName={policyName}
          exception={exceptionItemToDelete}
          onCancel={handleDeleteModalClose}
        />
      ) : null}
      <SearchExceptions
        placeholder={i18n.translate(
          'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.search.placeholder',
          {
            defaultMessage: 'Search on the fields below: name, description, IP',
          }
        )}
        defaultValue={urlParams.filter}
        hideRefreshButton
        onSearch={handleSearchInput}
      />
      <EuiSpacer size="s" />
      <EuiText
        color="subdued"
        size="xs"
        data-test-subj="policyDetailsHostIsolationExceptionsSearchCount"
      >
        {totalItemsCountLabel}
      </EuiText>
      <EuiSpacer size="m" />
      <ArtifactCardGrid
        items={policySearchedExceptionsListRequest?.data?.data || []}
        onPageChange={handlePageChange}
        onExpandCollapse={handleExpandCollapse}
        cardComponentProps={provideCardProps}
        pagination={pagination}
        loading={
          policiesRequest.isLoading ||
          policySearchedExceptionsListRequest.isLoading ||
          policySearchedExceptionsListRequest.isRefetching
        }
        data-test-subj={'hostIsolationExceptions-collapsed-list'}
      />
    </>
  );
};
PolicyHostIsolationExceptionsList.displayName = 'PolicyHostIsolationExceptionsList';
