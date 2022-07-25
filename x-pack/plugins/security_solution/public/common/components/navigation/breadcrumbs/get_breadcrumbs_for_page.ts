/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { SecurityPageName } from '../../../../app/types';
import { APP_NAME } from '../../../../../common/constants';
import { getAppLandingUrl } from '../../link_to/redirect_to_landing';

import type { GetSecuritySolutionUrl } from '../../link_to';
import { getAncestorLinksInfo } from '../../../links';
import type { GenericNavRecord } from '../types';

export const getLeadingBreadcrumbsForSecurityPage = (
  pageName: SecurityPageName,
  getSecuritySolutionUrl: GetSecuritySolutionUrl,
  navTabs: GenericNavRecord,
  isGroupedNavigationEnabled: boolean
): [ChromeBreadcrumb, ...ChromeBreadcrumb[]] => {
  const landingPath = getSecuritySolutionUrl({ deepLinkId: SecurityPageName.landing });

  const siemRootBreadcrumb: ChromeBreadcrumb = {
    text: APP_NAME,
    href: getAppLandingUrl(landingPath),
  };

  const breadcrumbs: ChromeBreadcrumb[] = getAncestorLinksInfo(pageName).map(({ title, id }) => {
    const newTitle = title;
    // Get title from navTabs because pages title on the new structure might be different.
    const oldTitle = navTabs[id] ? navTabs[id].name : title;

    return {
      text: isGroupedNavigationEnabled ? newTitle : oldTitle,
      href: getSecuritySolutionUrl({ deepLinkId: id }),
    };
  });

  return [siemRootBreadcrumb, ...breadcrumbs];
};
