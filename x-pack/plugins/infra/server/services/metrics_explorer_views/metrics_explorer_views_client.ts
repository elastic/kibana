/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Logger,
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';
import Boom from '@hapi/boom';
import {
  staticMetricsExplorerViewAttributes,
  staticMetricsExplorerViewId,
} from '../../../common/metrics_explorer_views';
import type {
  CreateMetricsExplorerViewAttributesRequestPayload,
  MetricsExplorerViewRequestQuery,
} from '../../../common/http_api/latest';
import type {
  MetricsExplorerView,
  MetricsExplorerViewAttributes,
} from '../../../common/metrics_explorer_views';
import { decodeOrThrow } from '../../../common/runtime_types';
import type { IInfraSources } from '../../lib/sources';
import { metricsExplorerViewSavedObjectName } from '../../saved_objects/metrics_explorer_view';
import { metricsExplorerViewSavedObjectRT } from '../../saved_objects/metrics_explorer_view/types';
import type { IMetricsExplorerViewsClient } from './types';

export class MetricsExplorerViewsClient implements IMetricsExplorerViewsClient {
  constructor(
    private readonly logger: Logger,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly infraSources: IInfraSources
  ) {}

  static STATIC_VIEW_ID = '0';
  static DEFAULT_SOURCE_ID = 'default';

  public async find(query: MetricsExplorerViewRequestQuery): Promise<MetricsExplorerView[]> {
    this.logger.debug('Trying to load metrics explorer views ...');

    const sourceId = query.sourceId ?? MetricsExplorerViewsClient.DEFAULT_SOURCE_ID;

    const [sourceConfiguration, metricsExplorerViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.getAllViews(),
    ]);

    const defaultView = MetricsExplorerViewsClient.createStaticView(
      sourceConfiguration.configuration.metricsExplorerDefaultView
    );
    const views = metricsExplorerViewSavedObject.saved_objects.map((savedObject) =>
      this.mapSavedObjectToMetricsExplorerView(
        savedObject,
        sourceConfiguration.configuration.metricsExplorerDefaultView
      )
    );

    const metricsExplorerViews = [defaultView, ...views];

    const sortedMetricsExplorerViews = this.moveDefaultViewOnTop(metricsExplorerViews);

    return sortedMetricsExplorerViews;
  }

  public async get(
    metricsExplorerViewId: string,
    query: MetricsExplorerViewRequestQuery
  ): Promise<MetricsExplorerView> {
    this.logger.debug(`Trying to load metrics explorer view with id ${metricsExplorerViewId} ...`);

    const sourceId = query.sourceId ?? MetricsExplorerViewsClient.DEFAULT_SOURCE_ID;

    // Handle the case where the requested resource is the static metrics explorer view
    if (metricsExplorerViewId === MetricsExplorerViewsClient.STATIC_VIEW_ID) {
      const sourceConfiguration = await this.infraSources.getSourceConfiguration(
        this.savedObjectsClient,
        sourceId
      );

      return MetricsExplorerViewsClient.createStaticView(
        sourceConfiguration.configuration.metricsExplorerDefaultView
      );
    }

    const [sourceConfiguration, metricsExplorerViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.get(metricsExplorerViewSavedObjectName, metricsExplorerViewId),
    ]);

    return this.mapSavedObjectToMetricsExplorerView(
      metricsExplorerViewSavedObject,
      sourceConfiguration.configuration.metricsExplorerDefaultView
    );
  }

  public async create(
    attributes: CreateMetricsExplorerViewAttributesRequestPayload
  ): Promise<MetricsExplorerView> {
    this.logger.debug(`Trying to create metrics explorer view ...`);

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name);

    const metricsExplorerViewSavedObject = await this.savedObjectsClient.create(
      metricsExplorerViewSavedObjectName,
      attributes
    );

    return this.mapSavedObjectToMetricsExplorerView(metricsExplorerViewSavedObject);
  }

  public async update(
    metricsExplorerViewId: string,
    attributes: CreateMetricsExplorerViewAttributesRequestPayload,
    query: MetricsExplorerViewRequestQuery
  ): Promise<MetricsExplorerView> {
    this.logger.debug(
      `Trying to update metrics explorer view with id "${metricsExplorerViewId}"...`
    );

    // Validate there is not a view with the same name
    await this.assertNameConflict(attributes.name, [metricsExplorerViewId]);

    const sourceId = query.sourceId ?? MetricsExplorerViewsClient.DEFAULT_SOURCE_ID;

    const [sourceConfiguration, metricsExplorerViewSavedObject] = await Promise.all([
      this.infraSources.getSourceConfiguration(this.savedObjectsClient, sourceId),
      this.savedObjectsClient.update(
        metricsExplorerViewSavedObjectName,
        metricsExplorerViewId,
        attributes
      ),
    ]);

    return this.mapSavedObjectToMetricsExplorerView(
      metricsExplorerViewSavedObject,
      sourceConfiguration.configuration.metricsExplorerDefaultView
    );
  }

  public delete(metricsExplorerViewId: string): Promise<{}> {
    this.logger.debug(
      `Trying to delete metrics explorer view with id ${metricsExplorerViewId} ...`
    );

    return this.savedObjectsClient.delete(
      metricsExplorerViewSavedObjectName,
      metricsExplorerViewId
    );
  }

  private getAllViews() {
    return this.savedObjectsClient.find<MetricsExplorerViewAttributes>({
      type: metricsExplorerViewSavedObjectName,
      perPage: 1000, // Fetch 1 page by default with a max of 1000 results
    });
  }

  private mapSavedObjectToMetricsExplorerView(
    savedObject: SavedObject | SavedObjectsUpdateResponse,
    defaultViewId?: string
  ) {
    const metricsExplorerViewSavedObject = decodeOrThrow(metricsExplorerViewSavedObjectRT)(
      savedObject
    );

    return {
      id: metricsExplorerViewSavedObject.id,
      version: metricsExplorerViewSavedObject.version,
      updatedAt: metricsExplorerViewSavedObject.updated_at,
      attributes: {
        ...metricsExplorerViewSavedObject.attributes,
        isDefault: metricsExplorerViewSavedObject.id === defaultViewId,
        isStatic: false,
      },
    };
  }

  private moveDefaultViewOnTop(views: MetricsExplorerView[]) {
    const defaultViewPosition = views.findIndex((view) => view.attributes.isDefault);

    if (defaultViewPosition !== -1) {
      const element = views.splice(defaultViewPosition, 1)[0];
      views.unshift(element);
    }

    return views;
  }

  /**
   * We want to control conflicting names on the views
   */
  private async assertNameConflict(name: string, whitelist: string[] = []) {
    const results = await this.getAllViews();

    const hasConflict = [
      MetricsExplorerViewsClient.createStaticView(),
      ...results.saved_objects,
    ].some((obj) => !whitelist.includes(obj.id) && obj.attributes.name === name);

    if (hasConflict) {
      throw Boom.conflict('A view with that name already exists.');
    }
  }

  private static createStaticView = (defaultViewId?: string): MetricsExplorerView => ({
    id: staticMetricsExplorerViewId,
    attributes: {
      ...staticMetricsExplorerViewAttributes,
      isDefault: defaultViewId === MetricsExplorerViewsClient.STATIC_VIEW_ID,
    },
  });
}
