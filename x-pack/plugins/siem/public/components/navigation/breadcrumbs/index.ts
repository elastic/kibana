/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { APP_NAME } from '../../../..';
import { getBreadcrumbs as getHostDetailsBreadcrumbs } from '../../../pages/hosts/host_details';
import { getBreadcrumbs as getIPDetailsBreadcrumbs } from '../../../pages/network/ip_details';
import { getHostsUrl, getNetworkUrl, getOverviewUrl } from '../../link_to';
import * as i18n from '../translations';

export const setBreadcrumbs = (pathname: string) => {
  const breadcrumbs = getBreadcrumbsForRoute(pathname);
  if (breadcrumbs) {
    chrome.breadcrumbs.set(breadcrumbs);
  }
};

export interface BreadcrumbItem {
  text: string;
  href?: string;
}

export const siemRootBreadcrumb: BreadcrumbItem[] = [
  {
    text: APP_NAME,
    href: getOverviewUrl(),
  },
];

const rootBreadcrumbs: { [name: string]: BreadcrumbItem[] } = {
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
};

export const getBreadcrumbsForRoute = (pathname: string): BreadcrumbItem[] | null => {
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
