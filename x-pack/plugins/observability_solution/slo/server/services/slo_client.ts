/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { IBasePath, KibanaRequest } from '@kbn/core-http-server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { CreateSLOParams, createSLOParamsSchema, updateSLOParamsSchema } from '@kbn/slo-schema';
import { isLeft } from 'fp-ts/Either';
import { forbidden } from '@hapi/boom';
import { firstValueFrom } from 'rxjs';
import { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import { DeleteSLO } from './delete_slo';
import { UpdateSLO } from './update_slo';
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

  async assertPlatinumLicense() {
    const licensing = await this.dependencies.licensing;
    const license = await firstValueFrom(licensing.license$);

    const hasPlatinumLicense = license.hasAtLeast('platinum');
    if (!hasPlatinumLicense) {
      throw forbidden('Platinum license or higher is needed to make use of this feature.');
    }
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
    await this.assertPlatinumLicense();
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

    return await createSLO.execute(params.right.body, false);
  }

  async updateSLO({
    sloId,
    soClient,
    esClient,
    spaceId,
    params: rawParams,
  }: {
    sloId: string;
    spaceId: string;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    params: CreateSLOParams;
  }) {
    await this.assertPlatinumLicense();

    const params = updateSLOParamsSchema.decode({ body: rawParams, path: { id: sloId } });
    if (isLeft(params)) {
      throw new Error('Invalid params');
    }

    const dataViews = await this.dependencies.getDataViewsStart();

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);
    const repository = new KibanaSavedObjectsSLORepository(soClient, this.logger);
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

    const updateSLO = new UpdateSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      this.logger,
      spaceId,
      this.basePath
    );

    return await updateSLO.execute(sloId, params.right.body);
  }

  async deleteSLO({
    sloId,
    soClient,
    esClient,
    spaceId,
    request,
  }: {
    sloId: string;
    spaceId: string;
    soClient: SavedObjectsClientContract;
    esClient: ElasticsearchClient;
    request?: KibanaRequest;
  }) {
    await this.assertPlatinumLicense();

    let rulesClient: RulesClientApi | undefined;

    const dataViews = await this.dependencies.getDataViewsStart();
    if (request) {
      rulesClient = await this.dependencies.getRulesClientWithRequest(request);
    }

    const dataViewsService = await dataViews.dataViewsServiceFactory(soClient, esClient);

    const repository = new KibanaSavedObjectsSLORepository(soClient, this.logger);
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

    const deleteSLO = new DeleteSLO(
      repository,
      transformManager,
      summaryTransformManager,
      esClient,
      rulesClient
    );

    await deleteSLO.execute(sloId);
  }
}
