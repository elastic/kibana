import type { APIEndpoint } from '../../../server';
import type { APIClientRequestParamsOf, APIReturnType } from './create_call_apm_api';
export declare const storybookMockHttp: {
    basePath: {
        prepend: (path: string) => string;
        get: () => string;
    };
    get: (pathname: string, options?: any) => Promise<any>;
    post: (pathname: string, options?: any) => Promise<any>;
    put: (pathname: string, options?: any) => Promise<any>;
    delete: (pathname: string, options?: any) => Promise<any>;
    patch: (pathname: string, options?: any) => Promise<any>;
};
export type MockApmApiCall = <TEndpoint extends APIEndpoint>(endpoint: TEndpoint, fn: (params: APIClientRequestParamsOf<TEndpoint>) => APIReturnType<TEndpoint>) => void;
export declare const mockApmApiCallResponse: MockApmApiCall;
export declare function clearMockResponses(): void;
