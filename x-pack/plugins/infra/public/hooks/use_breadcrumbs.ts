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
// import { UptimeUrlParams } from '../lib/helper';
// import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
// import { useUrlParams } from '.';

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

export const makeBaseBreadcrumb = (
  path: string,
  observabilityPath: string,
  title: string
  // params?: UptimeUrlParams
): [EuiBreadcrumb, EuiBreadcrumb] => {
  // if (params) {
  //   const crumbParams: Partial<UptimeUrlParams> = { ...params };

  //   delete crumbParams.statusFilter;
  //   const query = stringifyUrlParams(crumbParams, true);
  //   uptimePath += query === EMPTY_QUERY ? '' : query;
  // }

  return [
    {
      text: i18n.translate('xpack.uptime.breadcrumbs.observabilityText', {
        defaultMessage: 'Observability',
      }),
      href: observabilityPath,
    },
    {
      text: i18n.translate(`xpack.infra.header.${title}Title`, {
        defaultMessage: title,
      }),
      href: path,
    },
  ];
};

const titleToUpperCase = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[], app: string) => {
  const params = '';
  const kibana = useKibana();
  const setBreadcrumbs = kibana.services.chrome?.setBreadcrumbs;
  const path = kibana.services.application?.getUrlForApp(app) ?? '';
  const title = titleToUpperCase(app);
  const observabilityPath =
    kibana.services.application?.getUrlForApp('observability-overview') ?? '';
  const navigate = kibana.services.application?.navigateToUrl;

  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs(
        handleBreadcrumbClick(
          makeBaseBreadcrumb(path, observabilityPath, title, params).concat(extraCrumbs),
          navigate
        )
      );
    }
  }, [path, app, title, observabilityPath, extraCrumbs, navigate, params, setBreadcrumbs]);
};
