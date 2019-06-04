/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ServerRoute } from 'hapi';
import { ElasticsearchPlugin } from 'src/legacy/core_plugins/elasticsearch';

export {
  SavedObject,
  SavedObjectAttributes,
} from 'src/legacy/server/saved_objects/service/saved_objects_client';

export { Request, Server, ServerRoute } from 'hapi';

export interface CoreSetup {
  http: { route(route: ServerRoute | ServerRoute[]): void };
}

// the contract with the registry
export interface IntegrationInfo {
  description: string;
  name: string;
  version: string;
  icon: string;
}
