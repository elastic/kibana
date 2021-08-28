/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React from 'react';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import type { NavigateToPath } from '../../../contexts/kibana/use_navigate_to_path';
import { DatavisualizerSelector } from '../../../datavisualizer/datavisualizer_selector';
import { checkBasicLicense } from '../../../license/check_license';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import type { MlRoute, PageProps } from '../../router';
import { PageLoader } from '../../router';
import { useResolver } from '../../use_resolver';

export const selectorRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, {
    checkBasicLicense,
    checkFindFileStructurePrivilege: () =>
      checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
  });
  return (
    <PageLoader context={context}>
      <DatavisualizerSelector />
    </PageLoader>
  );
};
