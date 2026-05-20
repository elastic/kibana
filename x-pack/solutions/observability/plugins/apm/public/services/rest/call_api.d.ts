import type { CoreSetup, CoreStart } from '@kbn/core/public';
import type { FetchOptions } from '../../../common/fetch_options';
export declare function clearCache(): void;
export type CallApi = typeof callApi;
export declare function callApi<T = void>({ http, uiSettings }: CoreStart | CoreSetup, fetchOptions: FetchOptions): Promise<T>;
