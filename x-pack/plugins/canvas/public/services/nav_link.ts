/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CanvasServiceFactory } from '.';
import { SESSIONSTORAGE_LASTPATH } from '../../common/lib/constants';
import { getSessionStorage } from '../lib/storage';

export interface NavLinkService {
  updatePath: (path: string) => void;
}

export const navLinkServiceFactory: CanvasServiceFactory<NavLinkService> = (
  coreSetup,
  _coreStart,
  _setupPlugins,
  _startPlugins,
  appUpdater
) => {
  return {
    updatePath: (path: string) => {
      appUpdater.next(() => ({
        defaultPath: `#${path}`,
      }));

      getSessionStorage().set(`${SESSIONSTORAGE_LASTPATH}:${coreSetup.http.basePath.get()}`, path);
    },
  };
};
