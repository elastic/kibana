/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

<<<<<<< HEAD
import type { SavedObjectsClientContract } from '@kbn/core/server';
=======
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
>>>>>>> f30f0a8f33cca137f465bf6abd4f5567a9d866b8
import type { APMIndices } from '.';
import { getServices } from './services/get_services';
import type { ApmDataAccessPrivilegesCheck } from './lib/check_privileges';

export interface ApmDataAccessPluginSetup {
  apmIndicesFromConfigFile: APMIndices;
  getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
  getServices: typeof getServices;
}

export interface ApmDataAccessServerDependencies {
  security?: SecurityPluginStart;
}

export interface ApmDataAccessPluginStart {
  hasPrivileges: (params: Pick<ApmDataAccessPrivilegesCheck, 'request'>) => Promise<boolean>;
}
export interface ApmDataAccessServerDependencies {
  security?: SecurityPluginStart;
}

export type ApmDataAccessServices = ReturnType<typeof getServices>;
export type { ApmDataAccessServicesParams } from './services/get_services';
export type { DocumentSourcesRequest } from './services/get_document_sources';
export type { HostNamesRequest } from './services/get_host_names';
export type { GetDocumentTypeParams } from './services/get_document_type_config';
export type {
  APMEventClientConfig,
  APMEventESSearchRequest,
  APMLogEventESSearchRequest,
} from './lib/helpers';
export type { ApmDataAccessPrivilegesCheck };
