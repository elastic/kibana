/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'kibana/public';
import { MouseEvent, useEffect } from 'react';
import { useKibana } from '../utils/kibana_react';
import { useQueryParams } from './use_query_params';
import { observabilityAppId } from '../../common';

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

export const useRootBreadcrumb = (): ChromeBreadcrumb => {
  const { getUrlForApp } = useKibana().services.application;
  return {
    text: i18n.translate('xpack.observability.breadcrumbs.observabilityLinkText', {
      defaultMessage: 'Observability',
    }),
    href: getUrlForApp(observabilityAppId, { path: '/overview' }),
  };
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useQueryParams();
  const rootBreadcrumb = useRootBreadcrumb();
  const {
    services: {
      chrome: { docTitle, setBreadcrumbs },
      application: { navigateToUrl },
    },
  } = useKibana();
  const setTitle = docTitle.change;

  useEffect(() => {
    const breadcrumbs = [rootBreadcrumb, ...extraCrumbs];
    if (setBreadcrumbs) {
      setBreadcrumbs(addClickHandlers(breadcrumbs, navigateToUrl));
    }
    if (setTitle) {
      setTitle(getTitleFromBreadCrumbs(breadcrumbs));
    }
  }, [rootBreadcrumb, extraCrumbs, navigateToUrl, params, setBreadcrumbs, setTitle]);
};
