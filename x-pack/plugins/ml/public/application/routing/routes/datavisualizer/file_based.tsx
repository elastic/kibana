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
import { i18n } from '@kbn/i18n';

import { NavigateToPath } from '../../../contexts/kibana';

import { MlRoute, PageLoader, PageProps } from '../../router';
import { useResolver } from '../../use_resolver';
import { FileDataVisualizerPage } from '../../../datavisualizer/file_based';

import { checkBasicLicense } from '../../../license';
import { checkFindFileStructurePrivilegeResolver } from '../../../capabilities/check_capabilities';
import { loadIndexPatterns } from '../../../util/index_utils';

import { getBreadcrumbWithUrlForApp } from '../../breadcrumbs';
import { ML_PAGES } from '../../../../../common/constants/ml_url_generator';
import { useCreateAndNavigateToMlLink } from '../../../contexts/kibana/use_create_url';

export const fileBasedRouteFactory = (navigateToPath: NavigateToPath): MlRoute => ({
  path: '/filedatavisualizer',
  render: (props, deps) => <PageWrapper {...props} deps={deps} />,
  breadcrumbs: [
    getBreadcrumbWithUrlForApp('ML_BREADCRUMB', navigateToPath),
    getBreadcrumbWithUrlForApp('DATA_VISUALIZER_BREADCRUMB', navigateToPath),
    {
      text: i18n.translate('xpack.ml.dataVisualizer.fileBasedLabel', {
        defaultMessage: 'File',
      }),
      href: '',
    },
  ],
});

const PageWrapper: FC<PageProps> = ({ location, deps }) => {
  const redirectToMlAccessDeniedPage = useCreateAndNavigateToMlLink(ML_PAGES.ACCESS_DENIED);

  const { context } = useResolver('', undefined, deps.config, {
    checkBasicLicense,
    loadIndexPatterns: () => loadIndexPatterns(deps.indexPatterns),
    checkFindFileStructurePrivilege: () =>
      checkFindFileStructurePrivilegeResolver(redirectToMlAccessDeniedPage),
  });
  return (
    <PageLoader context={context}>
      <FileDataVisualizerPage kibanaConfig={deps.config} />
    </PageLoader>
  );
};
