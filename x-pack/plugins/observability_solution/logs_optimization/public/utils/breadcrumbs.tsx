/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBreadcrumb } from '@elastic/eui';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import { useEffect } from 'react';

export const useBreadcrumbs = (
  breadcrumbs: EuiBreadcrumb[],
  chromeService: ChromeStart,
  serverlessService?: ServerlessPluginStart
) => {
  const logsOptimizationLinkProps = useLinkProps({ app: 'logs-optimization' });

  useEffect(() => {
    setBreadcrumbs(
      serverlessService
        ? breadcrumbs
        : [
            {
              text: 'Logs optimizations',
              ...logsOptimizationLinkProps,
            },
            ...breadcrumbs,
          ],
      chromeService,
      serverlessService
    );
  }, [breadcrumbs, chromeService, serverlessService]); // eslint-disable-line react-hooks/exhaustive-deps
};

export function setBreadcrumbs(
  breadcrumbs: EuiBreadcrumb[],
  chromeService: ChromeStart,
  serverlessService?: ServerlessPluginStart
) {
  chromeService.docTitle.change(getDocTitle(breadcrumbs));
  if (serverlessService) {
    serverlessService.setBreadcrumbs(breadcrumbs);
  } else if (chromeService) {
    chromeService.setBreadcrumbs(breadcrumbs);
  }
}

export function getDocTitle(breadcrumbs: EuiBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text as string).reverse();
}

export const noBreadcrumbs: EuiBreadcrumb[] = [];
