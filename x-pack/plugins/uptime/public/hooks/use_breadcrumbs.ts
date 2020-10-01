/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { UptimeUrlParams } from '../lib/helper';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useUrlParams } from '.';
import { PLUGIN } from '../../common/constants/plugin';

const EMPTY_QUERY = '?';

export const makeBaseBreadcrumb = (
  href: string,
  navigateToHref?: (url: string) => Promise<void>,
  params?: UptimeUrlParams
): EuiBreadcrumb => {
  if (params) {
    const crumbParams: Partial<UptimeUrlParams> = { ...params };
    // We don't want to encode this values because they are often set to Date.now(), the relative
    // values in dateRangeStart are better for a URL.
    delete crumbParams.absoluteDateRangeStart;
    delete crumbParams.absoluteDateRangeEnd;
    const query = stringifyUrlParams(crumbParams, true);
    href += query === EMPTY_QUERY ? '' : query;
  }
  return {
    text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
      defaultMessage: 'Uptime',
    }),
    href,
    onClick: (event) => {
      if (href && navigateToHref) {
        event.preventDefault();
        navigateToHref(href);
      }
    },
  };
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useUrlParams()[0]();
  const kibana = useKibana();
  const setBreadcrumbs = kibana.services.chrome?.setBreadcrumbs;
  const appPath = kibana.services.application?.getUrlForApp(PLUGIN.ID) ?? '';
  const navigate = kibana.services.application?.navigateToUrl;
  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs([makeBaseBreadcrumb(appPath, navigate, params)].concat(extraCrumbs));
    }
  }, [appPath, extraCrumbs, navigate, params, setBreadcrumbs]);
};
