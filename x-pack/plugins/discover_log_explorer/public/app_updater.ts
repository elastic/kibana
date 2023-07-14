/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppUpdater } from '@kbn/core-application-browser';
import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import { LOG_EXPLORER_PROFILE_ID } from '../common/constants';

const logExplorerDeepLink = {
  id: LOG_EXPLORER_PROFILE_ID,
  title: i18n.translate('xpack.discoverLogExplorer.deepLink', {
    defaultMessage: 'Log Explorer',
  }),
  path: `#/p/log-explorer`,
};

export const createAppUpdater = () => {
  return new BehaviorSubject<AppUpdater>((app) => {
    if (app.id === 'discover') {
      return {
        deepLinks: [logExplorerDeepLink],
      };
    }
  });
};
