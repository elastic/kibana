/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { CoreStart } from '../../../../src/core/public';
import { APP_ID } from '../common/constants';
import {
  FactoryQueryTypes,
  StrategyResponseType,
} from '../common/search_strategy/security_solution';
import { SecurityPageName } from './app/types';
import { InspectResponse } from './types';

export const parseRoute = (location: Pick<Location, 'hash' | 'pathname' | 'search'>) => {
  if (!isEmpty(location.hash)) {
    const hashPath = location.hash.split('?');
    const search = hashPath.length >= 1 ? `?${hashPath[1]}` : '';
    const pageRoute = hashPath.length > 0 ? hashPath[0].split('/') : [];
    const pageName = pageRoute.length >= 1 ? pageRoute[1] : '';
    const path = `/${pageRoute.slice(2).join('/') ?? ''}${search}`;

    return {
      pageName,
      path,
      search,
    };
  }

  const search = location.search;
  const pageRoute = location.pathname.split('/');
  const pageName = pageRoute[3];
  const subpluginPath = pageRoute.length > 4 ? `/${pageRoute.slice(4).join('/')}` : '';
  const path = `${subpluginPath}${search}`;

  return {
    pageName,
    path,
    search,
  };
};

export const manageOldSiemRoutes = async (coreStart: CoreStart) => {
  const { application } = coreStart;
  const { pageName, path, search } = parseRoute(window.location);

  switch (pageName) {
    case SecurityPageName.overview:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, {
        replace: true,
        path,
      });
      break;
    case 'ml-hosts':
      application.navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
        replace: true,
        path: `/ml-hosts${path}`,
      });
      break;
    case SecurityPageName.hosts:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
        replace: true,
        path,
      });
      break;
    case 'ml-network':
      application.navigateToApp(`${APP_ID}:${SecurityPageName.network}`, {
        replace: true,
        path: `/ml-network${path}`,
      });
      break;
    case SecurityPageName.network:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.network}`, {
        replace: true,
        path,
      });
      break;
    case SecurityPageName.timelines:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.timelines}`, {
        replace: true,
        path,
      });
      break;
    case SecurityPageName.case:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
        replace: true,
        path,
      });
      break;
    case 'detections':
      application.navigateToApp(`${APP_ID}:${SecurityPageName.detections}`, {
        replace: true,
        path,
      });
      break;
    default:
      application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, {
        replace: true,
        path: `${search}`,
      });
      break;
  }
};

export const getInspectResponse = <T extends FactoryQueryTypes>(
  response: StrategyResponseType<T>,
  prevResponse: InspectResponse
): InspectResponse => ({
  dsl: response?.inspect?.dsl ?? prevResponse?.dsl ?? [],
  response:
    response != null ? [JSON.stringify(response.rawResponse, null, 2)] : prevResponse?.response,
});
