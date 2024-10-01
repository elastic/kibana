/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useState } from 'react';

import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { fetchAvailablePackagesHook } from './utils';
import { PackageListGrid } from './package_list_grid';
import { LOADING_SKELETON_HEIGHT } from './const';

export const AvailablePackages = React.memo(() => {
  const [fetchAvailablePackages, setFetchAvailablePackages] = useState<AvailablePackagesHookType>();

  const { error, retry, loading } = useAsyncRetry(async () => {
    if (fetchAvailablePackages) {
      return;
    }
    const loadedHook = await fetchAvailablePackagesHook();
    setFetchAvailablePackages(() => {
      return loadedHook;
    });
  });

  const onRetry = useCallback(() => {
    if (!loading) {
      retry();
    }
  }, [loading, retry]);

  if (error) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.securitySolution.onboarding.asyncLoadFailureCallout.title', {
          defaultMessage: 'Loading failure',
        })}
        color="warning"
        iconType="cross"
        size="m"
      >
        <p>
          <FormattedMessage
            id="xpack.securitySolution.onboarding.asyncLoadFailureCallout.copy"
            defaultMessage="Some required elements failed to load."
          />
        </p>
        <EuiButton color="warning" data-test-subj="retryButton" onClick={onRetry}>
          <FormattedMessage
            id="xpack.securitySolution.onboarding.asyncLoadFailureCallout.buttonContent"
            defaultMessage="Retry"
          />
        </EuiButton>
      </EuiCallOut>
    );
  }
  if (loading || !fetchAvailablePackages) {
    return (
      <EuiSkeletonText
        data-test-subj="loadingPackages"
        isLoading={true}
        lines={LOADING_SKELETON_HEIGHT}
      />
    );
  }
  return <PackageListGrid useAvailablePackages={fetchAvailablePackages} />;
});

AvailablePackages.displayName = 'AvailablePackages';
