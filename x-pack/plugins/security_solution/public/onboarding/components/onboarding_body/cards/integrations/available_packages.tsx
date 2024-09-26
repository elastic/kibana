/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef } from 'react';

import useAsyncRetry from 'react-use/lib/useAsyncRetry';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { fetchAvailablePackagesHook } from './utils';
import { PackageListGrid } from './package_list_grid';
import { LOADING_SKELETON_HEIGHT } from './const';

export const AvailablePackages = React.memo(() => {
  const ref = useRef<AvailablePackagesHookType | null>(null);

  const {
    error: errorLoading,
    retry: retryAsyncLoad,
    loading: asyncLoading,
  } = useAsyncRetry(async () => {
    ref.current = await fetchAvailablePackagesHook();
  });

  if (errorLoading)
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
        <EuiButton
          color="warning"
          data-test-subj="xpack.securitySolution.onboarding.asyncLoadFailureCallout.button"
          onClick={() => {
            if (!asyncLoading) retryAsyncLoad();
          }}
        >
          <FormattedMessage
            id="xpack.securitySolution.onboarding.asyncLoadFailureCallout.buttonContent"
            defaultMessage="Retry"
          />
        </EuiButton>
      </EuiCallOut>
    );

  if (asyncLoading || ref.current === null)
    return <EuiSkeletonText isLoading={true} lines={LOADING_SKELETON_HEIGHT} />;

  return <PackageListGrid useAvailablePackages={ref.current} />;
});

AvailablePackages.displayName = 'AvailablePackages';
