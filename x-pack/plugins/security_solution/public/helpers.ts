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
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, {
            replace: true,
            path,
          }),
        0
      );
    case 'ml-hosts':
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
            replace: true,
            path: `/ml-hosts${path}`,
          }),
        0
      );
    case SecurityPageName.hosts:
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.hosts}`, {
            replace: true,
            path,
          }),
        0
      );
    case 'ml-network':
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.network}`, {
            replace: true,
            path: `/ml-network${path}`,
          }),
        0
      );
    case SecurityPageName.network:
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.network}`, {
            replace: true,
            path,
          }),
        0
      );
    case SecurityPageName.timelines:
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.timelines}`, {
            replace: true,
            path,
          }),
        0
      );
    case SecurityPageName.case:
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.case}`, {
            replace: true,
            path,
          }),
        0
      );
    case 'detections':
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.alerts}`, {
            replace: true,
            path,
          }),
        0
      );
    default:
      window.setTimeout(
        () =>
          application.navigateToApp(`${APP_ID}:${SecurityPageName.overview}`, {
            replace: true,
            path: `?${search}`,
          }),
        0
      );
  }
};
