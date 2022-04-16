/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { useEffect } from 'react';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { observabilityTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

type AppId = 'logs' | 'metrics';

export const useBreadcrumbs = (app: AppId, appTitle: string, extraCrumbs: ChromeBreadcrumb[]) => {
  const {
    services: { chrome },
  } = useKibanaContextForPlugin();

  const observabilityLinkProps = useLinkProps({ app: 'observability-overview' });
  const appLinkProps = useLinkProps({ app });

  useEffect(() => {
    chrome?.setBreadcrumbs?.([
      {
        ...observabilityLinkProps,
        text: observabilityTitle,
      },
      {
        ...appLinkProps,
        text: appTitle,
      },
      ...extraCrumbs,
    ]);
  }, [appLinkProps, appTitle, chrome, extraCrumbs, observabilityLinkProps]);
};
