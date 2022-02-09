/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObjectsClientContract } from 'src/core/server';
import { LogView } from '../../../common/log_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { InfraSources } from '../../lib/sources';
import {
  logViewSavedObjectName,
  resolveLogViewSavedObjectRefences,
} from '../../saved_objects/log_view';
import { logViewSavedObjectRT } from '../../saved_objects/log_view/types';
import { ILogViewsClient } from './types';

export class LogViewsClient implements ILogViewsClient {
  constructor(
    private readonly logger: Logger,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: InfraSources,
    private readonly internalLogViews: Map<string, LogView>
  ) {}

  public async getLogView(logViewId: string): Promise<LogView> {
    return await this.getSavedLogView(logViewId);
  }

  private async getSavedLogView(logViewId: string): Promise<LogView> {
    const savedObject = await this.savedObjectsClient.get(logViewSavedObjectName, logViewId);
    const logViewSavedObject = decodeOrThrow(logViewSavedObjectRT)(savedObject);

    return {
      id: logViewSavedObject.id,
      version: logViewSavedObject.version,
      updatedAt: logViewSavedObject.updated_at,
      origin: 'stored' as 'stored',
      attributes: resolveLogViewSavedObjectRefences(
        logViewSavedObject.attributes,
        savedObject.references
      ),
    };
  }
}
