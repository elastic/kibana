import type { OmitByValue, Assign } from 'utility-types';
import type { ClientRequestParamsOf, EndpointOf, ReturnOf } from '@kbn/server-route-repository';
import type { APMServerRouteRepository } from '../../server';
import type { APMClientOptions } from '../services/rest/create_call_apm_api';
import type { FetcherResult } from './use_fetcher';
import { useFetcher } from './use_fetcher';
type APMProgressivelyLoadingServerRouteRepository = OmitByValue<{
    [key in keyof APMServerRouteRepository]: ClientRequestParamsOf<APMServerRouteRepository, key> extends {
        params: {
            query: {
                probability: any;
            };
        };
    } ? APMServerRouteRepository[key] : undefined;
}, undefined>;
type WithoutProbabilityParameter<T extends Record<string, any>> = {
    params: {
        query: {};
    };
} & Assign<T, {
    params: Omit<T['params'], 'query'> & {
        query: Omit<T['params']['query'], 'probability'>;
    };
}>;
type APMProgressiveAPIClient = <TEndpoint extends EndpointOf<APMProgressivelyLoadingServerRouteRepository>>(endpoint: TEndpoint, options: Omit<APMClientOptions, 'signal'> & WithoutProbabilityParameter<ClientRequestParamsOf<APMProgressivelyLoadingServerRouteRepository, TEndpoint>>) => Promise<ReturnOf<APMProgressivelyLoadingServerRouteRepository, TEndpoint>>;
export declare function useProgressiveFetcher<TReturn>(callback: (callApmApi: APMProgressiveAPIClient) => Promise<TReturn> | undefined, dependencies: any[], options?: Parameters<typeof useFetcher>[2]): FetcherResult<TReturn>;
export {};
