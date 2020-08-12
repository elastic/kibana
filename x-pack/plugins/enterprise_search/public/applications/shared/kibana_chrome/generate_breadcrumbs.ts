/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBreadcrumb } from '@elastic/eui';
import { History } from 'history';

import {
  ENTERPRISE_SEARCH_PLUGIN,
  APP_SEARCH_PLUGIN,
  WORKPLACE_SEARCH_PLUGIN,
} from '../../../../common/constants';

import { letBrowserHandleEvent } from '../react_router_helpers';

/**
 * Generate React-Router-friendly EUI breadcrumb objects
 * https://elastic.github.io/eui/#/navigation/breadcrumbs
 */

interface IGenerateBreadcrumbProps {
  text: string;
  path?: string;
  history?: History;
}

export const generateBreadcrumb = ({ text, path, history }: IGenerateBreadcrumbProps) => {
  const breadcrumb = { text } as EuiBreadcrumb;

  if (path && history) {
    breadcrumb.href = history.createHref({ pathname: path });
    breadcrumb.onClick = (event) => {
      if (letBrowserHandleEvent(event)) return;
      event.preventDefault();
      history.push(path);
    };
  }

  return breadcrumb;
};

/**
 * Product-specific breadcrumb helpers
 */

export type TBreadcrumbs = IGenerateBreadcrumbProps[];

export const enterpriseSearchBreadcrumbs = (history: History) => (
  breadcrumbs: TBreadcrumbs = []
) => [
  generateBreadcrumb({ text: ENTERPRISE_SEARCH_PLUGIN.NAME }),
  ...breadcrumbs.map(({ text, path }: IGenerateBreadcrumbProps) =>
    generateBreadcrumb({ text, path, history })
  ),
];

export const appSearchBreadcrumbs = (history: History) => (breadcrumbs: TBreadcrumbs = []) =>
  enterpriseSearchBreadcrumbs(history)([
    { text: APP_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);

export const workplaceSearchBreadcrumbs = (history: History) => (breadcrumbs: TBreadcrumbs = []) =>
  enterpriseSearchBreadcrumbs(history)([
    { text: WORKPLACE_SEARCH_PLUGIN.NAME, path: '/' },
    ...breadcrumbs,
  ]);
