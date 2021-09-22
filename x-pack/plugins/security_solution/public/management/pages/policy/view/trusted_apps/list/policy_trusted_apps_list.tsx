/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiLoadingSpinner, Pagination } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  doesPolicyHaveTrustedApps,
  getCurrentArtifactsLocation,
  getPolicyTrustedAppList,
  getPolicyTrustedAppsListPagination,
  isPolicyTrustedAppListLoading,
  policyIdFromParams,
} from '../../../store/policy_details/selectors';
import { getPolicyDetailsArtifactsListPath } from '../../../../../common/routing';

export const PolicyTrustedAppsList = memo(() => {
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);
  const hasTrustedApps = usePolicyDetailsSelector(doesPolicyHaveTrustedApps);
  const isLoading = usePolicyDetailsSelector(isPolicyTrustedAppListLoading);
  const trustedAppItems = usePolicyDetailsSelector(getPolicyTrustedAppList);
  const pagination = usePolicyDetailsSelector(getPolicyTrustedAppsListPagination);
  const urlParams = usePolicyDetailsSelector(getCurrentArtifactsLocation);

  // TODO:PT show load errors if any

  const handlePageChange = useCallback<ArtifactCardGridProps['onPageChange']>(
    ({ pageIndex, pageSize }) => {
      history.push(
        getPolicyDetailsArtifactsListPath(policyId, {
          ...urlParams,
          // If user changed page size, then reset page index back to the first page
          page_index: pageSize !== pagination.pageSize ? 0 : pageIndex,
          page_size: pageSize,
        })
      );
    },
    [history, pagination.pageSize, policyId, urlParams]
  );

  const handleExpandCollapse = useCallback<ArtifactCardGridProps['onExpandCollapse']>((change) => {
    // FIXME:PT implement callback
  }, []);

  const provideCardProps = useCallback(() => {
    // FIXME:PT implement callback

    return {
      actions: [{ children: 'one' }, { children: 'two' }],
    };
  }, []);

  if (hasTrustedApps.loading) {
    return (
      <div>
        <EuiLoadingSpinner className="essentialAnimation" size="xl" />
      </div>
    );
  }

  if (!hasTrustedApps.hasTrustedApps) {
    // TODO: implement empty state (task #1645)
    return <div>{'No trusted application'}</div>;
  }

  return (
    <>
      <ArtifactCardGrid
        items={trustedAppItems}
        onPageChange={handlePageChange}
        onExpandCollapse={handleExpandCollapse}
        cardComponentProps={provideCardProps}
        loading={isLoading}
        pagination={pagination as Pagination}
      />
    </>
  );
});
PolicyTrustedAppsList.displayName = 'PolicyTrustedAppsList';
