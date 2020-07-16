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

import { ApplicationStart } from 'kibana/public';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { DatavisualizerSelector } from '../../../datavisualizer';

import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const selectorRouteFactory = (getUrlForApp: ApplicationStart['getUrlForApp']): MlRoute => ({
  path: '/datavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', getUrlForApp),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', getUrlForApp),
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { context } = useResolver(undefined, undefined, deps.config, {
    checkBasicLicense,
    checkFindFileStructurePrivilege: checkFindFileStructurePrivilegeResolver,
  });
  return (
    <PageLoader context={context}>
      <DatavisualizerSelector />
    </PageLoader>
  );
};
