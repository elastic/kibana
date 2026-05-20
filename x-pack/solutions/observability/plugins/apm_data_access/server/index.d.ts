import type { PluginConfigDescriptor, PluginInitializerContext } from '@kbn/core/server';
export declare const config: PluginConfigDescriptor;
export declare function plugin(initializerContext: PluginInitializerContext): Promise<import("./plugin").ApmDataAccessPlugin>;
export type { ApmDataAccessPluginSetup, ApmDataAccessPluginStart, ApmDataAccessServices, ApmDataAccessServicesParams, APMEventClientConfig, APMEventESSearchRequest, APMLogEventESSearchRequest, DocumentSourcesRequest, HostNamesRequest, GetDocumentTypeParams, } from './types';
export { APMEventClient } from './lib/helpers';
