import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-server';
import type { ApmSourcesAccessPluginStart, ApmSourcesAccessPluginSetup, APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { getServices } from './services/get_services';
export interface ApmDataAccessPluginSetup {
    apmIndicesFromConfigFile: APMIndices;
    getApmIndices: (soClient: SavedObjectsClientContract) => Promise<APMIndices>;
    getServices: typeof getServices;
}
export interface ApmDataAccessServerSetupDependencies {
    apmSourcesAccess: ApmSourcesAccessPluginSetup;
}
export interface ApmDataAccessServerDependencies {
    apmSourcesAccess: ApmSourcesAccessPluginStart;
    security?: SecurityPluginStart;
}
export interface ApmDataAccessPluginStart {
}
export type ApmDataAccessServices = ReturnType<typeof getServices>;
export type { ApmDataAccessServicesParams } from './services/get_services';
export type { DocumentSourcesRequest } from './services/get_document_sources';
export type { HostNamesRequest } from './services/get_host_names';
export type { GetDocumentTypeParams } from './services/get_document_type_config';
export type { APMEventClientConfig, APMEventESSearchRequest, APMLogEventESSearchRequest, } from './lib/helpers';
