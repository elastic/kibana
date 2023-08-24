/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBreadcrumb } from '@elastic/eui';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import { useEffect } from 'react';
import { logExplorerAppTitle } from '../../common/translations';

export const useBreadcrumbs = (
  breadcrumbs: EuiBreadcrumb[],
  chromeService?: ChromeStart,
  serverlessService?: ServerlessPluginStart
) => {
  useEffect(() => {
    setBreadcrumbs(breadcrumbs, chromeService, serverlessService);
  }, [breadcrumbs, chromeService, serverlessService]);
};

export function setBreadcrumbs(
  breadcrumbs: EuiBreadcrumb[],
  chromeService?: ChromeStart,
  serverlessService?: ServerlessPluginStart
) {
  if (serverlessService) {
    serverlessService.setBreadcrumbs(breadcrumbs);
  } else if (chromeService) {
    chromeService.setBreadcrumbs([
      {
        text: logExplorerAppTitle,
      },
      ...breadcrumbs,
    ]);
  }
}

export const noBreadcrumbs: EuiBreadcrumb[] = [];
