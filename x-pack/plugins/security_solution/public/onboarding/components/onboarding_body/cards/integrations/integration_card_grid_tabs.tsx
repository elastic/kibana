/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import type { AvailablePackagesHookType } from '@kbn/fleet-plugin/public';
import { PackageListGrid } from './package_list_grid';
import { LOADING_SKELETON_HEIGHT } from './constants';
import { withLazyHook } from '../../../../../common/components/with_lazy_hook';

export const IntegrationsCardGridTabs = withLazyHook<
  {
    installedIntegrationsCount: number;
    isAgentRequired: boolean;
  },
  { useAvailablePackages: AvailablePackagesHookType }
>(
  PackageListGrid,
  () => import('@kbn/fleet-plugin/public').then((module) => module.AvailablePackagesHook()),
  <EuiSkeletonText
    data-test-subj="loadingPackages"
    isLoading={true}
    lines={LOADING_SKELETON_HEIGHT}
  />
);
