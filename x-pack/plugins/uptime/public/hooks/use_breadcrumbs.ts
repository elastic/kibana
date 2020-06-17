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
import { useGetUrlParams } from './use_url_params';

export const makeBaseBreadcrumb = (params?: UptimeUrlParams): ChromeBreadcrumb => {
  let href = '#/';
  if (params) {
    const crumbParams: Partial<UptimeUrlParams> = { ...params };
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
  const params = useGetUrlParams();
  const setBreadcrumbs = useKibana().services.chrome?.setBreadcrumbs;
  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs([makeBaseBreadcrumb(params)].concat(extraCrumbs));
    }
  }, [extraCrumbs, params, setBreadcrumbs]);
};
