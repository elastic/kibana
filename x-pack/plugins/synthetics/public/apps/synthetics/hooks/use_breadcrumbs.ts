/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { MouseEvent, useEffect } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SyntheticsUrlParams, stringifyUrlParams } from '../utils/url_params';
import { useUrlParams } from './use_url_params';
import { PLUGIN } from '../../../../common/constants/plugin';

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
  uptimePath: string,
  observabilityPath: string,
  params?: SyntheticsUrlParams
): [EuiBreadcrumb, EuiBreadcrumb] => {
  if (params) {
    const crumbParams: Partial<SyntheticsUrlParams> = { ...params };

    delete crumbParams.statusFilter;
    const query = stringifyUrlParams(crumbParams, true);
    uptimePath += query === EMPTY_QUERY ? '' : query;
  }

  return [
    {
      text: i18n.translate('xpack.synthetics.breadcrumbs.observabilityText', {
        defaultMessage: 'Observability',
      }),
      href: observabilityPath,
    },
    {
      text: i18n.translate('xpack.synthetics.breadcrumbs.overviewBreadcrumbText', {
        defaultMessage: 'Synthetics',
      }),
      href: uptimePath,
    },
  ];
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useUrlParams()[0]();
  const kibana = useKibana();
  const setBreadcrumbs = kibana.services.chrome?.setBreadcrumbs;
  const syntheticsPath =
    kibana.services.application?.getUrlForApp(PLUGIN.SYNTHETICS_PLUGIN_ID) ?? '';
  const observabilityPath =
    kibana.services.application?.getUrlForApp('observability-overview') ?? '';
  const navigate = kibana.services.application?.navigateToUrl;

  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs(
        handleBreadcrumbClick(
          makeBaseBreadcrumb(syntheticsPath, observabilityPath, params).concat(extraCrumbs),
          navigate
        )
      );
    }
  }, [syntheticsPath, observabilityPath, extraCrumbs, navigate, params, setBreadcrumbs]);
};
