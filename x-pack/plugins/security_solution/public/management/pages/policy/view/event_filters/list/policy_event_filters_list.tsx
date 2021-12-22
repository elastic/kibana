/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, Pagination } from '@elastic/eui';
import { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { useSearchAssignedEventFilters } from '../hooks';
import { SearchExceptions } from '../../../../../components/search_exceptions';
import { useEndpointPoliciesToArtifactPolicies } from '../../../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';

interface PolicyEventFiltersListProps {
  policyId: string;
}
export const PolicyEventFiltersList = React.memo<PolicyEventFiltersListProps>(({ policyId }) => {
  const policiesRequest = useGetEndpointSpecificPolicies();

  const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());
  const handleOnSearch = useCallback(() => {}, []);
  const handleOnExpandCollapse = useCallback(() => {}, []);
  const handleOnPageChange = useCallback(() => {}, []);

  const { data: eventFilters, isLoading: isLoadingEventFilters } = useSearchAssignedEventFilters(
    policyId,
    { filter: '' }
  );

  const [pagination, setPagination] = useState<Pagination>();

  const totalItemsCountLabel = useMemo<string>(() => {
    return i18n.translate(
      'xpack.securitySolution.endpoint.policy.eventFilters.list.totalItemCount',
      {
        defaultMessage: 'Showing {totalItemsCount, plural, one {# exception} other {# exceptions}}',
        values: { totalItemsCount: eventFilters?.data.length || 0 },
      }
    );
  }, [eventFilters?.data.length]);

  const artifactCardPolicies = useEndpointPoliciesToArtifactPolicies(policiesRequest.data?.items);
  const provideCardProps: ArtifactCardGridProps['cardComponentProps'] = (artifact) => {
    const item = artifact as ExceptionListItemSchema;
    return {
      expanded: expandedItemsMap.get(item.id) || false,
      actions: [],
      policies: artifactCardPolicies,
    };
  };

  return (
    <>
      <SearchExceptions
        placeholder={i18n.translate(
          'xpack.securitySolution.endpoint.policy.eventFilters.list.search.placeholder',
          {
            defaultMessage: 'Search on the fields below: name, comments, value',
          }
        )}
        defaultValue={''}
        hideRefreshButton
        onSearch={handleOnSearch}
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
        items={eventFilters?.data || []}
        onPageChange={handleOnPageChange}
        onExpandCollapse={handleOnExpandCollapse}
        cardComponentProps={provideCardProps}
        pagination={pagination}
        loading={isLoadingEventFilters}
        data-test-subj={'eventFilters-collapsed-list'}
      />
    </>
  );
});

PolicyEventFiltersList.displayName = 'PolicyEventFiltersList';
