/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, SavedObject, SavedObjectsClientContract } from 'src/core/server';
import type { PluginStart as DataViewsServerPluginStart } from 'src/plugins/data_views/server';
import { LogIndexReference as LogSourceLogIndexReference } from '../../../common/log_sources';
import {
  defaultLogViewAttributes,
  LogIndexReference,
  LogView,
  LogViewAttributes,
  LogViewsStaticConfig,
  ResolvedLogView,
  resolveLogView,
} from '../../../common/log_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { InfraSource, InfraSources } from '../../lib/sources';
import {
  extractLogViewSavedObjectReferences,
  logViewSavedObjectName,
  resolveLogViewSavedObjectReferences,
} from '../../saved_objects/log_view';
import { logViewSavedObjectRT } from '../../saved_objects/log_view/types';
import { NotFoundError } from './errors';
import { ILogViewsClient } from './types';

type DataViewsService = ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>;

export class LogViewsClient implements ILogViewsClient {
  static errors = {
    NotFoundError,
  };

  constructor(
    private readonly logger: Logger,
    private readonly dataViews: DataViewsService,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: InfraSources,
    private readonly internalLogViews: Map<string, LogView>,
    private readonly config: LogViewsStaticConfig
  ) {}

  public async getLogView(logViewId: string): Promise<LogView> {
    return await this.getSavedLogView(logViewId)
      .catch((err) =>
        this.savedObjectsClient.errors.isNotFoundError(err)
          ? this.getInternalLogView(logViewId)
          : Promise.reject(err)
      )
      .catch((err) =>
        err instanceof NotFoundError
          ? this.getLogViewFromInfraSourceConfiguration(logViewId)
          : Promise.reject(err)
      );
  }

  public async getResolvedLogView(logViewId: string): Promise<ResolvedLogView> {
    const logView = await this.getLogView(logViewId);
    const resolvedLogView = await this.resolveLogView(logView.attributes);
    return resolvedLogView;
  }

  public async putLogView(
    logViewId: string,
    logViewAttributes: Partial<LogViewAttributes>
  ): Promise<LogView> {
    this.logger.debug(`Trying to store log view "${logViewId}"...`);

    const logViewAttributesWithDefaults = {
      ...defaultLogViewAttributes,
      ...logViewAttributes,
    };

    const { attributes, references } = extractLogViewSavedObjectReferences(
      logViewAttributesWithDefaults
    );

    const savedObject = await this.savedObjectsClient.create(logViewSavedObjectName, attributes, {
      id: logViewId,
      overwrite: true,
      references,
    });

    return getLogViewFromSavedObject(savedObject);
  }

  public async resolveLogView(logViewAttributes: LogViewAttributes): Promise<ResolvedLogView> {
    return await resolveLogView(logViewAttributes, await this.dataViews, this.config);
  }

  private async getSavedLogView(logViewId: string): Promise<LogView> {
    this.logger.debug(`Trying to load stored log view "${logViewId}"...`);

    const savedObject = await this.savedObjectsClient.get(logViewSavedObjectName, logViewId);

    return getLogViewFromSavedObject(savedObject);
  }

  private async getInternalLogView(logViewId: string): Promise<LogView> {
    this.logger.debug(`Trying to load internal log view "${logViewId}"...`);

    const internalLogView = this.internalLogViews.get(logViewId);

    if (!internalLogView) {
      throw new NotFoundError(
        `Failed to load internal log view: no view with id "${logViewId}" found.`
      );
    }

    return internalLogView;
  }

  private async getLogViewFromInfraSourceConfiguration(sourceId: string): Promise<LogView> {
    this.logger.debug(`Trying to load log view from source configuration "${sourceId}"...`);

    const sourceConfiguration = await this.infraSources.getSourceConfiguration(
      this.savedObjectsClient,
      sourceId
    );

    return {
      id: sourceConfiguration.id,
      version: sourceConfiguration.version,
      updatedAt: sourceConfiguration.updatedAt,
      origin: `infra-source-${sourceConfiguration.origin}`,
      attributes: getAttributesFromSourceConfiguration(sourceConfiguration),
    };
  }
}

const getLogViewFromSavedObject = (savedObject: SavedObject<unknown>): LogView => {
  const logViewSavedObject = decodeOrThrow(logViewSavedObjectRT)(savedObject);

  return {
    id: logViewSavedObject.id,
    version: logViewSavedObject.version,
    updatedAt: logViewSavedObject.updated_at,
    origin: 'stored',
    attributes: resolveLogViewSavedObjectReferences(
      logViewSavedObject.attributes,
      savedObject.references
    ),
  };
};

export const getAttributesFromSourceConfiguration = ({
  configuration: { name, description, logIndices, logColumns },
}: InfraSource): LogViewAttributes => ({
  name,
  description,
  logIndices: getLogIndicesFromSourceConfigurationLogIndices(logIndices),
  logColumns,
});

const getLogIndicesFromSourceConfigurationLogIndices = (
  logIndices: LogSourceLogIndexReference
): LogIndexReference =>
  logIndices.type === 'index_pattern'
    ? {
        type: 'data_view',
        dataViewId: logIndices.indexPatternId,
      }
    : logIndices;
