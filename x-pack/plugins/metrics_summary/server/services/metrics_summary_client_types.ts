/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from 'kibana/server';

import { ModuleNames } from '../modules';

export interface ConstructorOptions {
  esClient: ElasticsearchClient;
}

export interface PostTransformsOptions {
  modules: ModuleNames[];
  autoStart: boolean;
  frequency: string;
  indices: string[];
  docsPerSecond: number | null;
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
