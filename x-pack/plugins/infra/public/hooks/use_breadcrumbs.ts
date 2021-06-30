/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from 'kibana/public';
import { MouseEvent, useEffect } from 'react';
import { EuiBreadcrumb } from '@elastic/eui';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { observabilityTitle } from '../translations';

type AppId = 'logs' | 'metrics';

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

const makeBaseBreadcrumb = (
  path: string,
  observabilityPath: string,
  appTitle: string
): [EuiBreadcrumb, EuiBreadcrumb] => {
  return [
    {
      text: observabilityTitle,
      href: observabilityPath,
    },
    {
      text: appTitle,
      href: path,
    },
  ];
};

export const useBreadcrumbs = (app: AppId, appTitle: string, extraCrumbs: ChromeBreadcrumb[]) => {
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
          makeBaseBreadcrumb(path, observabilityPath, appTitle).concat(extraCrumbs),
          navigate
        )
      );
    }
  }, [path, appTitle, observabilityPath, extraCrumbs, navigate, setBreadcrumbs]);
};
