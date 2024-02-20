/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useEffect } from 'react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { observabilityTitle } from '../translations';
import { useKibanaEnvironmentContext, useKibanaContextForPlugin } from './use_kibana';

type AppId = 'logs' | 'metrics';

export const useBreadcrumbs = (app: AppId, appTitle: string, extraCrumbs: ChromeBreadcrumb[]) => {
  const {
    services: { chrome, serverless },
  } = useKibanaContextForPlugin();

  const { isServerlessEnv } = useKibanaEnvironmentContext();

  const observabilityLinkProps = useLinkProps({ app: 'observability-overview' });
  const appLinkProps = useLinkProps({ app });

  useEffect(() => {
    const breadcrumbs = [
      {
        ...appLinkProps,
        text: appTitle,
      },
      ...extraCrumbs,
    ];

    const docTitle = [...breadcrumbs].reverse().map((breadcrumb) => breadcrumb.text as string);

    chrome.docTitle.change(docTitle);

    if (isServerlessEnv) {
      serverless?.setBreadcrumbs(breadcrumbs, { absolute: true });
    } else {
      // statefull breadcrumb starts with `Observability`
      chrome.setBreadcrumbs([
        {
          ...observabilityLinkProps,
          text: observabilityTitle,
        },
        ...breadcrumbs,
      ]);
    }
  }, [
    appLinkProps,
    appTitle,
    chrome,
    extraCrumbs,
    isServerlessEnv,
    observabilityLinkProps,
    serverless,
  ]);
};
