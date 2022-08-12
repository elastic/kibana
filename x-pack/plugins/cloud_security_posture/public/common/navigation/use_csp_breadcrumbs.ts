/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { MouseEvent } from 'react';
import type { ChromeBreadcrumb, CoreStart } from '@kbn/core/public';
import { useEffect } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { type RouteProps, useRouteMatch } from 'react-router-dom';
import type { EuiBreadcrumb } from '@elastic/eui';
import { string } from 'io-ts';
import useObservable from 'react-use/lib/useObservable';
import type { BreadcrumbEntry } from './types';

const getClickableBreadcrumb = (routeMatch: RouteProps['path'], breadcrumbPath: string) => {
  const hasParams = breadcrumbPath.includes(':');
  if (hasParams) return;

  if (routeMatch !== breadcrumbPath) {
    return breadcrumbPath.startsWith('/') ? `${breadcrumbPath}` : `/${breadcrumbPath}`;
  }
};

export const useCspBreadcrumbs = (breadcrumbs: BreadcrumbEntry[]) => {
  const {
    services: {
      chrome: { setBreadcrumbs, docTitle },
      application: { currentAppId$, applications$, navigateToApp },
    },
  } = useKibana<CoreStart>();

  const match = useRouteMatch();

  const appId = useObservable(currentAppId$);
  const applications = useObservable(applications$);
  const application = appId ? applications?.get(appId) : undefined;
  const appTitle = application?.title;

  useEffect(() => {
    const additionalBreadCrumbs: ChromeBreadcrumb[] = breadcrumbs.map((breadcrumb) => {
      const clickableLink = getClickableBreadcrumb(match.path, breadcrumb.path);

      return {
        text: breadcrumb.name,
        ...(clickableLink &&
          appId && {
            onClick: (e) => {
              e.preventDefault();
              void navigateToApp(appId, { path: clickableLink });
            },
          }),
      };
    });

    const nextBreadcrumbs = [
      {
        text: appTitle,
        ...(appId && {
          onClick: (e: MouseEvent<HTMLAnchorElement>) => {
            e.preventDefault();
            void navigateToApp(appId);
          },
        }),
      },
      ...additionalBreadCrumbs,
    ];

    setBreadcrumbs(nextBreadcrumbs);
    docTitle.change(getTextBreadcrumbs(nextBreadcrumbs));
  }, [match.path, setBreadcrumbs, breadcrumbs, docTitle, appTitle, appId, navigateToApp]);
};

const getTextBreadcrumbs = (breadcrumbs: EuiBreadcrumb[]) =>
  breadcrumbs.map((breadcrumb) => breadcrumb.text).filter(string.is);
