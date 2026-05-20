import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { ClientRequestParamsOf, ReturnOf, RouteRepositoryClient, ServerRouteRepository } from '@kbn/server-route-repository';
import type { InspectResponse } from '@kbn/observability-plugin/typings/common';
import type { FetchOptions } from '../../../common/fetch_options';
import type { APMServerRouteRepository, APIEndpoint } from '../../../server';
export type APMClientOptions = Omit<FetchOptions, 'query' | 'body' | 'pathname' | 'signal'> & {
    signal: AbortSignal | null;
};
export type APMClient = RouteRepositoryClient<APMServerRouteRepository, APMClientOptions>['fetch'];
export type AutoAbortedAPMClient = RouteRepositoryClient<APMServerRouteRepository, Omit<APMClientOptions, 'signal'>>['fetch'];
export type APIReturnType<TEndpoint extends APIEndpoint> = ReturnOf<APMServerRouteRepository, TEndpoint> & {
    _inspect?: InspectResponse;
};
export type APIClientRequestParamsOf<TEndpoint extends APIEndpoint> = ClientRequestParamsOf<APMServerRouteRepository, TEndpoint>;
export type AbstractAPMRepository = ServerRouteRepository;
export type AbstractAPMClient = RouteRepositoryClient<AbstractAPMRepository, APMClientOptions>['fetch'];
export declare let callApmApi: APMClient;
export declare function createCallApmApi(core: CoreStart | CoreSetup): void;
