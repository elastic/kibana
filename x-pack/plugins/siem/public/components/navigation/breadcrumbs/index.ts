/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome, { Breadcrumb } from 'ui/chrome';

import { APP_NAME } from '../../../..';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { getHostsUrl, getNetworkUrl, getOverviewUrl, getTimelinesUrl } from '../../link_to';
import * as i18n from '../translations';

export const setBreadcrumbs = (pathname: string) => {
  const breadcrumbs = getBreadcrumbsForRoute(pathname);
  if (breadcrumbs) {
    chrome.breadcrumbs.set(breadcrumbs);
  }
};

export const siemRootBreadcrumb: Breadcrumb[] = [
  {
    text: APP_NAME,
    href: getOverviewUrl(),
  },
];

export const rootBreadcrumbs: { [name: string]: Breadcrumb[] } = {
  overview: siemRootBreadcrumb,
  hosts: [
    ...siemRootBreadcrumb,
    {
      text: i18n.HOSTS,
      href: getHostsUrl(),
    },
  ],
  network: [
    ...siemRootBreadcrumb,
    {
      text: i18n.NETWORK,
      href: getNetworkUrl(),
    },
  ],
  timelines: [
    ...siemRootBreadcrumb,
    {
      text: i18n.TIMELINES,
      href: getTimelinesUrl(),
    },
  ],
};

export const getBreadcrumbsForRoute = (pathname: string): Breadcrumb[] | null => {
  const trailingPath = pathname.match(/([^\/]+$)/);
  if (trailingPath !== null) {
    if (Object.keys(rootBreadcrumbs).includes(trailingPath[0])) {
      return rootBreadcrumbs[trailingPath[0]];
    }
    if (pathname.match(/hosts\/.*?/)) {
      return [...siemRootBreadcrumb, ...getHostDetailsBreadcrumbs(trailingPath[0])];
    } else if (pathname.match(/network\/ip\/.*?/)) {
      return [...siemRootBreadcrumb, ...getIPDetailsBreadcrumbs(trailingPath[0])];
    }
  }
  return null;
};
