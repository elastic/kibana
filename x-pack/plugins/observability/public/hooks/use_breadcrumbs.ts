/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { MouseEvent, useEffect } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { stringify } from 'query-string';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useQueryParams } from './use_query_params';

const EMPTY_QUERY = '?';

function handleBreadcrumbClick(
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

export const makeBaseBreadcrumb = (href: string, params?: any): EuiBreadcrumb => {
  if (params) {
    const crumbParams = { ...params };

    delete crumbParams.statusFilter;
    const query = stringify(crumbParams, { skipEmptyString: true, skipNull: true });
    href += query === EMPTY_QUERY ? '' : query;
  }
  return {
    text: i18n.translate('xpack.observability.breadcrumbs.observability', {
      defaultMessage: 'Observability',
    }),
    href,
  };
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useQueryParams();

  const {
    services: { chrome, application },
  } = useKibana();

  const setBreadcrumbs = chrome?.setBreadcrumbs;
  const appPath = application?.getUrlForApp('observability-overview') ?? '';
  const navigate = application?.navigateToUrl;

  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs(
        handleBreadcrumbClick([makeBaseBreadcrumb(appPath, params)].concat(extraCrumbs), navigate)
      );
    }
  }, [appPath, extraCrumbs, navigate, params, setBreadcrumbs]);
};
