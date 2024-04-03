/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBreadcrumb } from '@elastic/eui';
import type { ChromeStart } from '@kbn/core-chrome-browser';
import {
  LOGS_APP_ID,
  OBSERVABILITY_LOGS_EXPLORER_APP_ID,
  OBSERVABILITY_OVERVIEW_APP_ID,
} from '@kbn/deeplinks-observability';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import type { ServerlessPluginStart } from '@kbn/serverless/public';
import { useEffect } from 'react';
import {
  logsExplorerAppTitle,
  logsAppTitle,
  observabilityAppTitle,
} from '../../common/translations';

export const useBreadcrumbs = (
  breadcrumbs: EuiBreadcrumb[],
  chromeService: ChromeStart,
  serverlessService?: ServerlessPluginStart
) => {
  const observabilityLinkProps = useLinkProps({ app: OBSERVABILITY_OVERVIEW_APP_ID });
  const logsLinkProps = useLinkProps({ app: LOGS_APP_ID });
  const logsExplorerLinkProps = useLinkProps({ app: OBSERVABILITY_LOGS_EXPLORER_APP_ID });

  useEffect(() => {
    setBreadcrumbs(
      serverlessService
        ? breadcrumbs
        : [
            {
              text: observabilityAppTitle,
              ...observabilityLinkProps,
            },
            {
              text: logsAppTitle,
              ...logsLinkProps,
            },
            {
              text: logsExplorerAppTitle,
              ...logsExplorerLinkProps,
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
