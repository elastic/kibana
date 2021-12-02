/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FoundExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import React, { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  MANAGEMENT_DEFAULT_PAGE_SIZE,
  MANAGEMENT_PAGE_SIZE_OPTIONS,
} from '../../../../../common/constants';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { useEndpointPoliciesToArtifactPolicies } from '../../../../../components/artifact_entry_card/hooks/use_endpoint_policies_to_artifact_policies';
import { useGetEndpointSpecificPolicies } from '../../../../../services/policies/hooks';

export const PolicyHostIsolationExceptionsList = ({
  exceptions,
}: {
  exceptions: FoundExceptionListItemSchema;
}) => {
  const history = useHistory();
  // load the list of policies>
  const policiesRequest = useGetEndpointSpecificPolicies({});

  const [expandedItemsMap, setExpandedItemsMap] = useState<Map<string, boolean>>(new Map());

  const handlePageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
    ({ pageIndex, pageSize }) => {
      history.push('');
    },
    [history]
  );

  const pagination = {
    totalItemCount: exceptions?.total ?? 0,
    pageSize: exceptions?.per_page ?? MANAGEMENT_DEFAULT_PAGE_SIZE,
    pageSizeOptions: [...MANAGEMENT_PAGE_SIZE_OPTIONS],
    pageIndex: (exceptions?.page ?? 1) - 1,
  };

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

  return (
    <ArtifactCardGrid
      items={exceptions.data}
      onPageChange={handlePageChange}
      onExpandCollapse={handleExpandCollapse}
      cardComponentProps={provideCardProps}
      pagination={pagination}
      loading={policiesRequest.isLoading}
      data-test-subj={'hostIsolationExceptions-collapsed-list'}
    />
  );
};
PolicyHostIsolationExceptionsList.displayName = 'PolicyHostIsolationExceptionsList';
