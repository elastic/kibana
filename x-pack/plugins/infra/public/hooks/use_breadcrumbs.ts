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
import { useKibana } from '../../../../../src/plugins/kibana_react/public';

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

type AppId = 'logs' | 'metrics';

export const makeBaseBreadcrumb = (
  path: string,
  observabilityPath: string,
  app: AppId
): [EuiBreadcrumb, EuiBreadcrumb] => {
  const appText =
    app === 'logs'
      ? i18n.translate('xpack.infra.header.logsTitle', {
          defaultMessage: 'Logs',
        })
      : i18n.translate('xpack.infra.header.metricsTitle', {
          defaultMessage: 'Metrics',
        });
  return [
    {
      text: i18n.translate('xpack.infra.header.observabilityTitle', {
        defaultMessage: 'Observability',
      }),
      href: observabilityPath,
    },
    {
      text: appText,
      href: path,
    },
  ];
};

export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[], app: AppId) => {
  const kibana = useKibana();
  const setBreadcrumbs = kibana.services.chrome?.setBreadcrumbs;
  const path = kibana.services.application?.getUrlForApp(app) ?? '';
  const observabilityPath =
    kibana.services.application?.getUrlForApp('observability-overview') ?? '';
  const navigate = kibana.services.application?.navigateToUrl;

  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs(
        handleBreadcrumbClick(
          makeBaseBreadcrumb(path, observabilityPath, app).concat(extraCrumbs),
          navigate
        )
      );
    }
  }, [path, app, observabilityPath, extraCrumbs, navigate, setBreadcrumbs]);
};
