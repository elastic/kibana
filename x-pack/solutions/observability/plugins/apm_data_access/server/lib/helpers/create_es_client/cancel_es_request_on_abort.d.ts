import type { KibanaRequest } from '@kbn/core/server';
export declare function cancelEsRequestOnAbort<T extends Promise<any>>(promise: T, request: KibanaRequest, controller: AbortController): T;
