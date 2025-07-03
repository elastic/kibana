/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

const getAppAndPage = (url: string): { appName: string; pageName: string } | null => {
  const urlPathOnly = url.split('?')[0];
  const urlParts = urlPathOnly.split('/').filter(Boolean);

  const appIndex = urlParts.indexOf('app');

  if (appIndex !== -1 && urlParts.length > appIndex + 2) {
    const appName = urlParts[appIndex + 1];
    const pageName = urlParts[appIndex + 2];
    return { appName, pageName };
  }

  return null;
};

export const getFileName = (url: string, app?: string, page?: string) => {
  const dateTime = moment().toISOString();

  if (!app && !page) {
    const appAndPage = getAppAndPage(url);

    if (!appAndPage) {
      return `screenshot_${dateTime}`;
    }

    return `${appAndPage.appName}_${appAndPage.pageName}_${dateTime}`;
  }

  return `${app}_${page}_${dateTime}`;
};
