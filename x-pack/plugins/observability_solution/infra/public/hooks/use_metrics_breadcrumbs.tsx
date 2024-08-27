/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { METRICS_APP } from '../../common/constants';
import { metricsTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export const useMetricsBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  options?: { omitOnServerless?: boolean }
) => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const { omitOnServerless = false } = options || {};
  const appLinkProps = useLinkProps({ app: METRICS_APP });

  const breadcrumbs = useMemo(() => {
    if (omitOnServerless && serverless) {
      return [];
    }
    return serverless
      ? extraCrumbs
      : [
          {
            ...appLinkProps,
            text: metricsTitle,
          },
          ...extraCrumbs,
        ];
  }, [omitOnServerless, serverless, extraCrumbs, appLinkProps]);

  useBreadcrumbs(breadcrumbs, { serverless });
};
