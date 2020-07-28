/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreStart } from '../../../../src/core/public';
import { APP_ID } from '../common/constants';
import { SecurityPageName } from './app/types';

export const manageOldSiemRoutes = async (coreStart: CoreStart) => {
  const { application } = coreStart;
  const hashPath = window.location.hash.split('?');
  const search = hashPath.length >= 1 ? hashPath[1] : '';
  const pageRoute = hashPath.length > 0 ? hashPath[0].split('/') : [];
  const pageName = pageRoute.length >= 1 ? pageRoute[1] : '';
  const path = `/${pageRoute.slice(2).join('/') ?? ''}?${search}`;

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
        path: `?${search}`,
      });
      break;
  }
};
