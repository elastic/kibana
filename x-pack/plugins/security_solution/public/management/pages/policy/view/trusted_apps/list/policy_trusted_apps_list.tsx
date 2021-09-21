/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import {
  ArtifactCardGrid,
  ArtifactCardGridProps,
} from '../../../../../components/artifact_card_grid';
import { usePolicyDetailsSelector } from '../../policy_hooks';
import {
  doesPolicyHaveTrustedApps,
  getPolicyTrustedAppList,
  isPolicyTrustedAppListLoading,
} from '../../../store/policy_details/selectors';

export const PolicyTrustedAppsList = memo(() => {
  const hasTrustedApps = usePolicyDetailsSelector(doesPolicyHaveTrustedApps);
  const isLoading = usePolicyDetailsSelector(isPolicyTrustedAppListLoading);
  const trustedAppItems = usePolicyDetailsSelector(getPolicyTrustedAppList);

  // TODO:PT show load errors if any

  const handlePageChange = useCallback<ArtifactCardGridProps['onPageChange']>((page) => {
    // FIXME:PT implement callback
  }, []);

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
      />
    </>
  );
});
PolicyTrustedAppsList.displayName = 'PolicyTrustedAppsList';
