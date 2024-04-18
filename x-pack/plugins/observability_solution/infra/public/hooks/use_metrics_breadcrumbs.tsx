/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { ChromeBreadcrumb } from '@kbn/core/public';
import { useBreadcrumbs, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { METRICS_APP } from '../../common/constants';
import { metricsTitle } from '../translations';
import { useKibanaContextForPlugin } from './use_kibana';

export const useMetricsBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  options?: { deeperContextServerless: boolean }
) => {
  const {
    services: { serverless },
  } = useKibanaContextForPlugin();
  const appLinkProps = useLinkProps({ app: METRICS_APP });

  const breadcrumbs = useMemo(
    () => [
      {
        ...appLinkProps,
        text: metricsTitle,
      },
      ...extraCrumbs,
    ],
    [appLinkProps, extraCrumbs]
  );

  useBreadcrumbs(breadcrumbs);

  useEffect(() => {
    // For deeper context breadcrumbs in serveless, the `serverless` plugin provides its own breadcrumb service.
    // https://docs.elastic.dev/kibana-dev-docs/serverless-project-navigation#breadcrumbs
    if (serverless && options?.deeperContextServerless) {
      // The initial path is already set in the breadcrumbs
      const [, ...serverlessBreadcrumbs] = breadcrumbs;
      serverless.setBreadcrumbs(serverlessBreadcrumbs);
    }
  }, [breadcrumbs, options?.deeperContextServerless, serverless]);
};
