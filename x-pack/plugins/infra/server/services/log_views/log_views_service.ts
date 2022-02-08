/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, Logger } from 'src/core/server';
import { LogView, LogViewAttributes } from '../../../common/log_views';
import { LogViewsClient } from './log_views_client';
import {
  LogViewsServiceSetup,
  LogViewsServiceSetupDeps,
  LogViewsServiceStart,
  LogViewsServiceStartDeps,
} from './types';

export class LogViewsService {
  private internalLogViews: Map<string, LogView> = new Map();

  constructor(private readonly logger: Logger) {}

  public setup(_deps: LogViewsServiceSetupDeps): LogViewsServiceSetup {
    const { internalLogViews } = this;

    return {
      defineInternalLogView(logViewId: string, logViewAttributes: LogViewAttributes) {
        internalLogViews.set(logViewId, {
          id: logViewId,
          origin: 'internal',
          attributes: logViewAttributes,
          updatedAt: Date.now(),
        });
      },
    };
  }

  public start({ infraSources, savedObjects }: LogViewsServiceStartDeps): LogViewsServiceStart {
    const { logger } = this;

    return {
      getScopedClient(request: KibanaRequest) {
        return new LogViewsClient(logger, savedObjects.getScopedClient(request), infraSources);
      },
    };
  }
}
