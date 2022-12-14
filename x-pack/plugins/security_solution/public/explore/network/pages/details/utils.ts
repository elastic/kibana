/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { decodeIpv6 } from '../../../../common/lib/helpers';
import { getNetworkDetailsUrl } from '../../../../common/components/link_to/redirect_to_network';
import { networkModel } from '../../store';
import * as i18n from '../translations';
import { NetworkDetailsRouteType } from './types';
import type { NetworkRouteSpyState } from '../../../../common/utils/route/types';
import { SecurityPageName } from '../../../../app/types';
import type { GetSecuritySolutionUrl } from '../../../../common/components/link_to';
import { NetworkRouteType } from '../navigation/types';

export const type = networkModel.NetworkType.details;
const TabNameMappedToI18nKey: Record<NetworkDetailsRouteType | NetworkRouteType, string> = {
  [NetworkDetailsRouteType.events]: i18n.NAVIGATION_EVENTS_TITLE,
  [NetworkDetailsRouteType.anomalies]: i18n.NAVIGATION_ANOMALIES_TITLE,
  [NetworkDetailsRouteType.flows]: i18n.NAVIGATION_FLOWS_TITLE,
  [NetworkDetailsRouteType.users]: i18n.NAVIGATION_USERS_TITLE,
  [NetworkDetailsRouteType.http]: i18n.NAVIGATION_HTTP_TITLE,
  [NetworkDetailsRouteType.tls]: i18n.NAVIGATION_TLS_TITLE,
  [NetworkRouteType.dns]: i18n.NAVIGATION_DNS_TITLE,
};

export const getTrailingBreadcrumbs = (
  params: NetworkRouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName != null) {
    breadcrumb = [
      {
        text: decodeIpv6(params.detailName),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.network,
          path: getNetworkDetailsUrl(params.detailName, params.flowTarget, ''),
        }),
      },
    ];
  }

  const tabName = get('tabName', params);
  if (!tabName) return breadcrumb;

  breadcrumb = [
    ...breadcrumb,
    {
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    },
  ];
  return breadcrumb;
};
