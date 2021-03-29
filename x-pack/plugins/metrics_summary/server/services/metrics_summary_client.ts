/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { getTransforms } from './get_transforms';
import {
  ConstructorOptions,
  DeleteTransformsOptions,
  PostTransformsOptions,
} from './metrics_summary_client_types';
import { postTransforms } from './post_transforms';
import { deleteTransforms } from './delete_transforms';

export class MetricsSummaryClient {
  private readonly esClient: ElasticsearchClient;

  constructor({ esClient }: ConstructorOptions) {
    this.esClient = esClient;
  }

  // TODO: Type the unknown to be stronger
  public getTransforms = async (): Promise<unknown> => {
    const { esClient } = this;
    return getTransforms({ esClient });
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
    const { esClient } = this;
    return postTransforms({
      autoStart,
      docsPerSecond,
      esClient,
      frequency,
      indices,
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
    const { esClient } = this;
    return deleteTransforms({ esClient, modules, prefix, suffix });
  };
}
