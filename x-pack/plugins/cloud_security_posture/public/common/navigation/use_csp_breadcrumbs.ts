/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type RouteProps, useRouteMatch, useHistory } from 'react-router-dom';
import type { EuiBreadcrumb } from '@elastic/eui';
import { string } from 'io-ts';
import { i18n } from '@kbn/i18n';
import type { CspNavigationItem } from './types';

const getClickableBreadcrumb = (
  routeMatch: RouteProps['path'],
  breadcrumbPath: CspNavigationItem['path']
) => {
  const hasParams = breadcrumbPath.includes(':');
  if (hasParams) return;

  if (routeMatch !== breadcrumbPath) {
    return breadcrumbPath.startsWith('/') ? `${breadcrumbPath}` : `/${breadcrumbPath}`;
  }
};

export const useCspBreadcrumbs = (breadcrumbs: CspNavigationItem[]) => {
  const {
    services: {
      chrome: { setBreadcrumbs, docTitle },
      application: { getUrlForApp },
    },
  } = useKibana<CoreStart>();
  const match = useRouteMatch();
  const history = useHistory();

  useEffect(() => {
    const additionalBreadCrumbs: ChromeBreadcrumb[] = breadcrumbs.map((breadcrumb) => {
      const clickableLink = getClickableBreadcrumb(match.path, breadcrumb.path);

      return {
        text: breadcrumb.name,
        ...(clickableLink && {
          onClick: (e) => {
            e.preventDefault();
            history.push(clickableLink);
          },
        }),
      };
    });

    const nextBreadcrumbs = [
      {
        text: i18n.translate('xpack.csp.navigation.cloudPostureBreadcrumbLabel', {
          defaultMessage: 'Cloud Posture',
        }),
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          e.preventDefault();
          history.push(`/`);
        },
      },
      ...additionalBreadCrumbs,
    ];

    setBreadcrumbs(nextBreadcrumbs);
    docTitle.change(getTextBreadcrumbs(nextBreadcrumbs));
  }, [match.path, getUrlForApp, setBreadcrumbs, breadcrumbs, history, docTitle]);
};

const getTextBreadcrumbs = (breadcrumbs: EuiBreadcrumb[]) =>
  breadcrumbs.map((breadcrumb) => breadcrumb.text).filter(string.is);
