/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiText, Pagination } from '@elastic/eui';
import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useSearchAssignedEventFilters } from '../hooks';
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
  usePolicyDetailsEventFiltersNavigateCallback,
  usePolicyDetailsSelector,
} from '../../policy_hooks';
import { getCurrentArtifactsLocation } from '../../../store/policy_details/selectors';
import { EventFiltersHttpService } from '../../../../event_filters/service';
import { useHttp } from '../../../../../../common/lib/kibana';

interface PolicyEventFiltersListProps {
  policyId: string;
}
export const PolicyEventFiltersList = React.memo<PolicyEventFiltersListProps>(({ policyId }) => {
  const http = useHttp();
  const eventFiltersService = useMemo(() => new EventFiltersHttpService(http), [http]);
  const policiesRequest = useGetEndpointSpecificPolicies();
  const navigateCallback = usePolicyDetailsEventFiltersNavigateCallback();
  const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());
  const [eventFiltersResults, setEventFiltersResults] = useState<FoundExceptionListItemSchema>();

  const pagination: Pagination = {
    pageSize: urlParams.page_size || MANAGEMENT_DEFAULT_PAGE_SIZE,
    pageIndex: urlParams.page_index || 0,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    totalItemCount: eventFiltersResults?.total || 0,
  };

  const { data: eventFilters, isLoading: isLoadingEventFilters } = useSearchAssignedEventFilters(
    eventFiltersService,
    policyId,
    { page: pagination.pageIndex, perPage: pagination.pageSize, filter: urlParams.filter }
  );

  useEffect(() => {
    if (eventFilters) setEventFiltersResults(eventFilters);
  }, [eventFilters]);

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
      if (eventFilters?.total) navigateCallback({ page_index: pageIndex, page_size: pageSize });
    },
    [eventFilters?.total, navigateCallback]
  );

  const totalItemsCountLabel = useMemo<string>(() => {
    return i18n.translate(
      'xpack.securitySolution.endpoint.policy.eventFilters.list.totalItemCount',
      {
        defaultMessage: 'Showing {totalItemsCount, plural, one {# exception} other {# exceptions}}',
        values: { totalItemsCount: eventFiltersResults?.data.length || 0 },
      }
    );
  }, [eventFiltersResults?.data.length]);

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
        defaultValue={urlParams.filter}
        hideRefreshButton
        onSearch={handleOnSearch}
      />
      <EuiSpacer size="s" />
      <EuiText color="subdued" size="xs" data-test-subj="policyDetailsEventFiltersSearchCount">
        {totalItemsCountLabel}
      </EuiText>
      <EuiSpacer size="m" />
      <ArtifactCardGrid
        items={eventFiltersResults?.data || []}
        onPageChange={handleOnPageChange}
        onExpandCollapse={handleOnExpandCollapse}
        cardComponentProps={provideCardProps}
        pagination={eventFiltersResults ? pagination : undefined}
        loading={isLoadingEventFilters}
        data-test-subj={'eventFilters-collapsed-list'}
      />
    </>
  );
});

PolicyEventFiltersList.displayName = 'PolicyEventFiltersList';
