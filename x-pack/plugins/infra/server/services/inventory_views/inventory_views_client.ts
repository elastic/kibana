/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginStart as DataViewsServerPluginStart } from '@kbn/data-views-plugin/server';
import {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsUtils,
  SavedObjectsErrorHelpers,
} from '@kbn/core/server';
import {
  defaultInventoryViewAttributes,
  defaultInventoryViewId,
  LogIndexReference,
  InventoryView,
  InventoryViewAttributes,
  InventoryViewReference,
  InventoryViewsStaticConfig,
  persistedInventoryViewReferenceRT,
  ResolvedInventoryView,
  resolveInventoryView,
} from '../../../common/log_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import { LogIndexReference as SourceConfigurationLogIndexReference } from '../../../common/source_configuration/source_configuration';
import type { IInfraSources, InfraSource } from '../../lib/sources';
import {
  extractInventoryViewSavedObjectReferences,
  inventoryViewSavedObjectName,
  resolveInventoryViewSavedObjectReferences,
} from '../../saved_objects/log_view';
import { inventoryViewSavedObjectRT } from '../../saved_objects/log_view/types';
import { NotFoundError } from './errors';
import { IInventoryViewsClient } from './types';

type DataViewsService = ReturnType<DataViewsServerPluginStart['dataViewsServiceFactory']>;

export class InventoryViewsClient implements IInventoryViewsClient {
  static errors = {
    NotFoundError,
  };

  constructor(
    private readonly logger: Logger,
    private readonly dataViews: DataViewsService,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: IInfraSources,
    private readonly internalInventoryViews: Map<string, InventoryView>,
    private readonly config: InventoryViewsStaticConfig
  ) {}

  public async getInventoryView(inventoryViewId: string): Promise<InventoryView> {
    return await this.getSavedInventoryView(inventoryViewId)
      .catch((err) =>
        SavedObjectsErrorHelpers.isNotFoundError(err) || err instanceof NotFoundError
          ? this.getInternalInventoryView(inventoryViewId)
          : Promise.reject(err)
      )
      .catch((err) =>
        err instanceof NotFoundError
          ? this.getInventoryViewFromInfraSourceConfiguration(inventoryViewId)
          : Promise.reject(err)
      );
  }

  findInventoryView() {}
  deleteInventoryView(inventoryViewId: string) {}

  public async getResolvedInventoryView(
    inventoryViewReference: InventoryViewReference
  ): Promise<ResolvedInventoryView> {
    const inventoryView = persistedInventoryViewReferenceRT.is(inventoryViewReference)
      ? await this.getInventoryView(inventoryViewReference.inventoryViewId)
      : inventoryViewReference;
    const resolvedInventoryView = await this.resolveInventoryView(
      inventoryView.id,
      inventoryView.attributes
    );
    return resolvedInventoryView;
  }

  public async putInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: Partial<InventoryViewAttributes>
  ): Promise<InventoryView> {
    const resolvedInventoryViewId =
      (await this.resolveInventoryViewId(inventoryViewId)) ?? SavedObjectsUtils.generateId();

    this.logger.debug(
      `Trying to store inventory view "${inventoryViewId}" as "${resolvedInventoryViewId}"...`
    );

    const inventoryViewAttributesWithDefaults = {
      ...defaultInventoryViewAttributes,
      ...inventoryViewAttributes,
    };

    const { attributes, references } = extractInventoryViewSavedObjectReferences(
      inventoryViewAttributesWithDefaults
    );

    const savedObject = await this.savedObjectsClient.create(
      inventoryViewSavedObjectName,
      attributes,
      {
        id: resolvedInventoryViewId,
        overwrite: true,
        references,
      }
    );

    return getInventoryViewFromSavedObject(savedObject);
  }

  public async resolveInventoryView(
    inventoryViewId: string,
    inventoryViewAttributes: InventoryViewAttributes
  ): Promise<ResolvedInventoryView> {
    return await resolveInventoryView(
      inventoryViewId,
      inventoryViewAttributes,
      await this.dataViews,
      this.config
    );
  }

  private async getSavedInventoryView(inventoryViewId: string): Promise<InventoryView> {
    this.logger.debug(`Trying to load stored log view "${inventoryViewId}"...`);

    const resolvedInventoryViewId = await this.resolveInventoryViewId(inventoryViewId);

    if (!resolvedInventoryViewId) {
      throw new NotFoundError(
        `Failed to load saved log view: the log view id "${inventoryViewId}" could not be resolved.`
      );
    }

    const savedObject = await this.savedObjectsClient.get(
      inventoryViewSavedObjectName,
      resolvedInventoryViewId
    );

    return getInventoryViewFromSavedObject(savedObject);
  }

  private async getInternalInventoryView(inventoryViewId: string): Promise<InventoryView> {
    this.logger.debug(`Trying to load internal log view "${inventoryViewId}"...`);

    const internalInventoryView = this.internalInventoryViews.get(inventoryViewId);

    if (!internalInventoryView) {
      throw new NotFoundError(
        `Failed to load internal log view: no view with id "${inventoryViewId}" found.`
      );
    }

    return internalInventoryView;
  }

  private async getInventoryViewFromInfraSourceConfiguration(
    sourceId: string
  ): Promise<InventoryView> {
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

  private async resolveInventoryViewId(inventoryViewId: string): Promise<string | null> {
    // only the default id needs to be transformed
    if (inventoryViewId !== defaultInventoryViewId) {
      return inventoryViewId;
    }

    return await this.getNewestSavedInventoryViewId();
  }

  private async getNewestSavedInventoryViewId(): Promise<string | null> {
    const response = await this.savedObjectsClient.find({
      type: inventoryViewSavedObjectName,
      sortField: 'updated_at',
      sortOrder: 'desc',
      perPage: 1,
      fields: [],
    });

    const [newestSavedInventoryView] = response.saved_objects;

    return newestSavedInventoryView?.id ?? null;
  }
}

const getInventoryViewFromSavedObject = (savedObject: SavedObject<unknown>): InventoryView => {
  const inventoryViewSavedObject = decodeOrThrow(inventoryViewSavedObjectRT)(savedObject);

  return {
    id: inventoryViewSavedObject.id,
    version: inventoryViewSavedObject.version,
    updatedAt: inventoryViewSavedObject.updated_at,
    origin: 'stored',
    attributes: resolveInventoryViewSavedObjectReferences(
      inventoryViewSavedObject.attributes,
      savedObject.references
    ),
  };
};

export const getAttributesFromSourceConfiguration = ({
  configuration: { name, description, logIndices, logColumns },
}: InfraSource): InventoryViewAttributes => ({
  name,
  description,
  logIndices: getLogIndicesFromSourceConfigurationLogIndices(logIndices),
  logColumns,
});

const getLogIndicesFromSourceConfigurationLogIndices = (
  logIndices: SourceConfigurationLogIndexReference
): LogIndexReference =>
  logIndices.type === 'index_pattern'
    ? {
        type: 'data_view',
        dataViewId: logIndices.indexPatternId,
      }
    : logIndices;
