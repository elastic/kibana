/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';

import type { Logger } from '../../../../../src/core/server';
import { ModuleNames } from '../modules';

export interface ConstructorOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  kibanaVersion: string;
}

export interface PostTransformsOptions {
  modules: ModuleNames[];
  autoStart: boolean;
  frequency: string;
  indices: string[];
  docsPerSecond: number | undefined;
  maxPageSearchSize: number;
  prefix: string;
  query: object;
  suffix: string;
  sync: {
    time: {
      delay: string;
      field: string;
    };
  };
}

export interface DeleteTransformsOptions {
  modules: ModuleNames[];
  prefix: string;
  suffix: string;
}
