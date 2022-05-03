/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';
import { NavigateToPath } from '../../../contexts/kibana';
import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { AiopsSelector } from '../../../aiops';
import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const aiopsRouteFactory = (navigateToPath: NavigateToPath, basePath: string): MlRoute => ({
  id: 'aiops',
  path: '/aiops',
  title: i18n.translate('xpack.ml.aiops.docTitle', {
    defaultMessage: 'AIOps',
  }),
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('AIOPS_BREADCRUMB'),
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, deps.dataViewsContract, {
    checkBasicLicense,
    checkFindFileStructurePrivilege: () =>
      checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
  });
  return (
    <PageLoader context={context}>
      <AiopsSelector />
    </PageLoader>
  );
};
