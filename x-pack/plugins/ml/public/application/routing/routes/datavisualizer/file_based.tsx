/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { i18n } from '@kbn/i18n';

import { CoreStart } from 'kibana/public';
import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { FileDataVisualizerPage } from '../../../../../../file_upload/public';

import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { loadIndexPatterns } from '../../../util/index_utils';
import { useMlKibana } from '../../../contexts/kibana';

import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';

export const fileBasedRouteFactory = (
  navigateToPath: NavigateToPath,
  basePath: string
): MlRoute => ({
  path: '/filedatavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath, basePath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath, basePath),
    {
      text: i18n.translate('xpack.ml.dataVisualizer.fileBasedLabel', {
        defaultMessage: 'File',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const { redirectToMlAccessDeniedPage } = deps;

  const { context } = useResolver(undefined, undefined, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkFindFileStructurePrivilege: () =>
      checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
  });

  const {
    services: { data, embeddable, /* maps,*/ security, savedObjects },
  } = useMlKibana();
  const coreStart = { savedObjects } as CoreStart;

  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage
        coreStart={coreStart}
        data={data}
        embeddable={embeddable}
        // maps={maps}
        security={security}
      />
    </PageLoader>
  );
};
