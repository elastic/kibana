/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import type { Logger } from '../../../../../src/core/server';

import { getTransforms } from './get_transforms';
import {
  ConstructorOptions,
  DeleteTransformsOptions,
  PostTransformsOptions,
} from './metrics_entities_client_types';
import { postTransforms } from './post_transforms';
import { deleteTransforms } from './delete_transforms';

export class MetricsEntitiesClient {
  private readonly esClient: ElasticsearchClient;
  private readonly logger: Logger;
  private readonly kibanaVersion: string;

  constructor({ esClient, logger, kibanaVersion }: ConstructorOptions) {
    this.esClient = esClient;
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;
  }

  // TODO: Type the unknown to be stronger
  public getTransforms = async (): Promise<unknown> => {
    const { esClient, logger } = this;
    return getTransforms({ esClient, logger });
  };

  public postTransforms = async ({
    autoStart,
    frequency,
    docsPerSecond,
    maxPageSearchSize,
    modules,
    indices,
    prefix,
    suffix,
    query,
    sync,
  }: PostTransformsOptions): Promise<void> => {
    const { esClient, logger, kibanaVersion } = this;
    return postTransforms({
      autoStart,
      docsPerSecond,
      esClient,
      frequency,
      indices,
      kibanaVersion,
      logger,
      maxPageSearchSize,
      modules,
      prefix,
      query,
      suffix,
      sync,
    });
  };

  public deleteTransforms = async ({
    modules,
    prefix,
    suffix,
  }: DeleteTransformsOptions): Promise<void> => {
    const { esClient, logger } = this;
    return deleteTransforms({ esClient, logger, modules, prefix, suffix });
  };
}
