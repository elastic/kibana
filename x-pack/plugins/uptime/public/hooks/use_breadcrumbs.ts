/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { useEffect } from 'react';
import { UptimeUrlParams } from '../lib/helper';
import { stringifyUrlParams } from '../lib/helper/stringify_url_params';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { useUrlParams } from '.';

export const makeBaseBreadcrumb = (params?: UptimeUrlParams): ChromeBreadcrumb => {
  let href = '#/';
  if (params) {
    const crumbParams: Partial<UptimeUrlParams> = { ...params };
    // We don't want to encode this values because they are often set to Date.now(), the relative
    // values in dateRangeStart are better for a URL.
    delete crumbParams.absoluteDateRangeStart;
    delete crumbParams.absoluteDateRangeEnd;
    href += stringifyUrlParams(crumbParams, true);
  }
  return {
    text: i18n.translate('xpack.uptime.breadcrumbs.overviewBreadcrumbText', {
      defaultMessage: 'Uptime',
    }),
    href,
  };
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useUrlParams()[0]();
  const setBreadcrumbs = useKibana().services.chrome?.setBreadcrumbs;
  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs([makeBaseBreadcrumb(params)].concat(extraCrumbs));
    }
  }, [extraCrumbs, params, setBreadcrumbs]);
};
