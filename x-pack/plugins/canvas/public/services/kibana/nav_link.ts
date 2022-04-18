/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaPluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { SESSIONSTORAGE_LASTPATH } from '../../../common/lib/constants';
import { getSessionStorage } from '../../lib/storage';
import { CanvasStartDeps } from '../../plugin';
import { CanvasNavLinkService } from '../nav_link';

export type CanvasNavLinkServiceFactory = KibanaPluginServiceFactory<
  CanvasNavLinkService,
  CanvasStartDeps
>;

export const navLinkServiceFactory: CanvasNavLinkServiceFactory = ({ coreStart, appUpdater }) => ({
  updatePath: (path: string) => {
    appUpdater?.next(() => ({
      defaultPath: `#${path}`,
    }));

    getSessionStorage().set(`${SESSIONSTORAGE_LASTPATH}:${coreStart.http.basePath.get()}`, path);
  },
});
