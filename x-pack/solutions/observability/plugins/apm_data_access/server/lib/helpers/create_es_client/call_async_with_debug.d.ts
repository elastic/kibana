import type { KibanaRequest } from '@kbn/core/server';
import { type InspectResponse } from '@kbn/observability-shared-plugin/common';
export declare function callAsyncWithDebug<T>({ cb, debug, request, requestParams, operationName, isCalledWithInternalUser, inspectableEsQueriesMap, }: {
    cb: () => Promise<T>;
    debug: boolean;
    request?: KibanaRequest;
    requestParams: Record<string, any>;
    operationName: string;
    isCalledWithInternalUser: boolean;
    inspectableEsQueriesMap?: WeakMap<KibanaRequest, InspectResponse>;
}): Promise<T>;
