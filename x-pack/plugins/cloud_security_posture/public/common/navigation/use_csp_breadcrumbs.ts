/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../../common';
import type { CspNavigationItem } from './types';
import { CLOUD_POSTURE } from './translations';

export const useCspBreadcrumbs = (breadcrumbs: CspNavigationItem[]) => {
  const {
    services: {
      chrome: { setBreadcrumbs },
      application: { getUrlForApp },
    },
  } = useKibana<CoreStart>();

  useEffect(() => {
    const cspPath = getUrlForApp(PLUGIN_ID);
    const additionalBreadCrumbs: ChromeBreadcrumb[] = breadcrumbs.map((breadcrumb) => ({
      text: breadcrumb.name,
      path: breadcrumb.path.startsWith('/')
        ? `${cspPath}${breadcrumb.path}`
        : `${cspPath}/${breadcrumb.path}`,
    }));

    setBreadcrumbs([
      {
        text: CLOUD_POSTURE,
        href: cspPath,
      },
      ...additionalBreadCrumbs,
    ]);
  }, [getUrlForApp, setBreadcrumbs, breadcrumbs]);
};
