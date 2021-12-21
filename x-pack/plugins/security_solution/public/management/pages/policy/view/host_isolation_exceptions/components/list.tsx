/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../../../common/constants';
import { getPolicyHostIsolationExceptionsPath } from '../../../../../common/routing';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { useEndpointPoliciesToArtifactPolicies } from '../../../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { usePolicyDetailsSelector } from '../../policy_hooks';

export const PolicyHostIsolationExceptionsList = ({
  exceptions,
  policyId,
}: {
  exceptions: FoundExceptionListItemSchema;
  policyId: string;
}) => {
  const history = useHistory();
  // load the list of policies>
  const policiesRequest = useGetEndpointSpecificPolicies();
  const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());

  const pagination = {
    totalItemCount: exceptions?.total ?? 0,
    pageSize: exceptions?.per_page ?? MANAGEMENT_DEFAULT_PAGE_SIZE,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    pageIndex: (exceptions?.page ?? 1) - 1,
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

  const provideCardProps: ArtifactCardGridProps['cardComponentProps'] = (item) => {
    return {
      expanded: expandedItemsMap.get(item.id) || false,
      actions: [],
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

  const totalItemsCountLabel = useMemo<string>(() => {
    return i18n.translate(
      'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.totalItemCount',
      {
        defaultMessage: 'Showing {totalItemsCount, plural, one {# exception} other {# exceptions}}',
        values: { totalItemsCount: pagination.totalItemCount },
      }
    );
  }, [pagination.totalItemCount]);

  return (
    <>
      <SearchExceptions
        placeholder={i18n.translate(
          'xpack.securitySolution.endpoint.policy.hostIsolationExceptions.list.search.placeholder',
          {
            defaultMessage: 'Search on the fields below: name, description, value, ip',
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
        items={exceptions.data}
        onPageChange={handlePageChange}
        onExpandCollapse={handleExpandCollapse}
        cardComponentProps={provideCardProps}
        pagination={pagination}
        loading={policiesRequest.isLoading}
        data-test-subj={'hostIsolationExceptions-collapsed-list'}
      />
    </>
  );
};
PolicyHostIsolationExceptionsList.displayName = 'PolicyHostIsolationExceptionsList';
