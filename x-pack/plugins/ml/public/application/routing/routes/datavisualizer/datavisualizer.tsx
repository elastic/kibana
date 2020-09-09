/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { DatavisualizerSelector } from '../../../datavisualizer';

import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';

export const selectorRouteFactory = (navigateToPath: NavigateToPath): MlRoute => ({
  path: '/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath),
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const redirectToMlAccessDeniedPage = useCreateAndNavigateToMlLink(ML_PAGES.ACCESS_DENIED);

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
