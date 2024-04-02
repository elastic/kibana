/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ApplicationStart, ChromeBreadcrumb, ChromeStart } from '@kbn/core/public';
import { MouseEvent, useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { ChromeBreadcrumbsAppendExtension } from '@kbn/core-chrome-browser';
import { useQueryParams } from './use_query_params';

function addClickHandlers(
  breadcrumbs: ChromeBreadcrumb[],
  navigateToHref?: (url: string) => Promise<void>
) {
  return breadcrumbs.map((bc) => ({
    ...bc,
    ...(bc.href
      ? {
          onClick: (event: MouseEvent) => {
            if (navigateToHref && bc.href) {
              event.preventDefault();
              navigateToHref(bc.href);
            }
          },
        }
      : {}),
  }));
}

function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

export const useBreadcrumbs = (
  extraCrumbs: ChromeBreadcrumb[],
  app?: { id: string; label: string },
  breadcrumbsAppendExtension?: ChromeBreadcrumbsAppendExtension
) => {
  const params = useQueryParams();

  const {
    services: {
      chrome: { docTitle, setBreadcrumbs, setBreadcrumbsAppendExtension },
      application: { getUrlForApp, navigateToUrl },
    },
  } = useKibana<{
    application: ApplicationStart;
    chrome: ChromeStart;
  }>();
  const setTitle = docTitle.change;
  const appPath = getUrlForApp(app?.id ?? 'observability-overview') ?? '';

  useEffect(() => {
    if (breadcrumbsAppendExtension) {
      setBreadcrumbsAppendExtension(breadcrumbsAppendExtension);
    }
    return () => {
      if (breadcrumbsAppendExtension) {
        setBreadcrumbsAppendExtension(undefined);
      }
    };
  }, [breadcrumbsAppendExtension, setBreadcrumbsAppendExtension]);

  useEffect(() => {
    const breadcrumbs = [
      {
        text:
          app?.label ??
          i18n.translate('xpack.observabilityShared.breadcrumbs.observabilityLinkText', {
            defaultMessage: 'Observability',
          }),
        href: appPath + '/overview',
      },
      ...extraCrumbs,
    ];
    if (setBreadcrumbs) {
      setBreadcrumbs(addClickHandlers(breadcrumbs, navigateToUrl));
    }
    if (setTitle) {
      setTitle(getTitleFromBreadCrumbs(breadcrumbs));
    }
  }, [app?.label, appPath, extraCrumbs, navigateToUrl, params, setBreadcrumbs, setTitle]);
};
