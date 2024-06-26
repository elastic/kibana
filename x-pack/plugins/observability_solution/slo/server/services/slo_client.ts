/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IBasePath } from '@kbn/core-http-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { CreateSLOParams, createSLOParamsSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import { RegisterRoutesDependencies } from '../routes/register_routes';
import { KibanaSavedObjectsSLORepository } from './slo_repository';
import { DefaultTransformManager } from './transform_manager';
import { DefaultSummaryTransformManager } from './summay_transform_manager';
import { DefaultSummaryTransformGenerator } from './summary_transform_generator/summary_transform_generator';
import { CreateSLO } from './create_slo';

export class SLOClient {
  private basePath: IBasePath;
  private dependencies: RegisterRoutesDependencies;
  private logger: Logger;

  constructor(dependencies: RegisterRoutesDependencies) {
    this.dependencies = dependencies;
    this.basePath = dependencies.pluginsSetup.core.http.basePath;
    this.logger = dependencies.logger;
  }

  async createSLO({
    soClient,
    esClient,
    spaceId,
    params: rawParams,
  }: {
    spaceId: string;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    params: CreateSLOParams;
  }) {
    const params = createSLOParamsSchema.decode({ body: rawParams });
    if (isLeft(params)) {
      throw new Error('Invalid params');
    }
    const dataViews = await this.dependencies.getDataViewsStart();

    const repository = new KibanaSavedObjectsSLORepository(soClient, this.logger);

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const transformManager = new DefaultTransformManager(
      esClient,
      this.logger,
      spaceId,
      dataViewsService
    );
    const summaryTransformManager = new DefaultSummaryTransformManager(
      new DefaultSummaryTransformGenerator(),
      esClient,
      this.logger
    );

    const createSLO = new CreateSLO(
      esClient,
      repository,
      transformManager,
      summaryTransformManager,
      this.logger,
      spaceId,
      this.basePath
    );

    return await createSLO.execute(params.right.body);
  }

  updateSLO() {}

  deleteSLO() {}
}
