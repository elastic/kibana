import type { HttpFetchOptions } from '@kbn/core/public';
export type FetchOptions = Omit<HttpFetchOptions, 'body'> & {
    pathname: string;
    isCachable?: boolean;
    method?: string;
    body?: any;
};
