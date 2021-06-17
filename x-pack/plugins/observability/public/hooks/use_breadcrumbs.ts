/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ChromeBreadcrumb } from 'kibana/public';
import { MouseEvent, useEffect } from 'react';
<<<<<<< HEAD
import { EuiBreadcrumb } from '@elastic/eui';
=======
import { useKibana } from '../utils/kibana_react';
>>>>>>> master
import { useQueryParams } from './use_query_params';
import { useKibana } from '../utils/kibana_react';

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

<<<<<<< HEAD
export const makeBaseBreadcrumb = (href: string): EuiBreadcrumb => {
  return {
    text: i18n.translate('xpack.observability.breadcrumbs.observability', {
      defaultMessage: 'Observability',
    }),
    href,
  };
};
export const casesBreadcrumbs = {
  cases: {
    text: i18n.translate('xpack.observability.breadcrumbs.observability.cases', {
      defaultMessage: 'Cases',
    }),
  },
  create: {
    text: i18n.translate('xpack.observability.breadcrumbs.observability.cases.create', {
      defaultMessage: 'Create',
    }),
  },
  configure: {
    text: i18n.translate('xpack.observability.breadcrumbs.observability.cases.configure', {
      defaultMessage: 'Configure',
    }),
  },
};
=======
function getTitleFromBreadCrumbs(breadcrumbs: ChromeBreadcrumb[]) {
  return breadcrumbs.map(({ text }) => text?.toString() ?? '').reverse();
}

>>>>>>> master
export const useBreadcrumbs = (extraCrumbs: ChromeBreadcrumb[]) => {
  const params = useQueryParams();

  const {
    services: {
<<<<<<< HEAD
      chrome: { setBreadcrumbs },
      application: { getUrlForApp, navigateToUrl },
    },
  } = useKibana();

  const appPath = getUrlForApp('observability-overview') ?? '';
  const navigate = navigateToUrl;
=======
      chrome: { docTitle, setBreadcrumbs },
      application: { getUrlForApp, navigateToUrl },
    },
  } = useKibana();
  const setTitle = docTitle.change;
  const appPath = getUrlForApp('observability-overview') ?? '';
>>>>>>> master

  useEffect(() => {
    const breadcrumbs = [
      {
        text: i18n.translate('xpack.observability.breadcrumbs.observabilityLinkText', {
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
  }, [appPath, extraCrumbs, navigateToUrl, params, setBreadcrumbs, setTitle]);
};
