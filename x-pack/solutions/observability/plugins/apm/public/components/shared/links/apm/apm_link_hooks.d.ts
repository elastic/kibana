import type { EuiLinkAnchorProps } from '@elastic/eui';
import type { IBasePath } from '@kbn/core/public';
import type { APMQueryParams } from '../url_helpers';
interface Props extends EuiLinkAnchorProps {
    path?: string;
    query?: APMQueryParams;
    mergeQuery?: (query: APMQueryParams) => APMQueryParams;
    children?: React.ReactNode;
}
export type APMLinkExtendProps = Omit<Props, 'path'>;
export declare const PERSISTENT_APM_PARAMS: Array<keyof APMQueryParams>;
/**
 * Hook to get a link for a path with persisted filters
 */
export declare function useAPMHref({ path, persistedFilters, query, pathParams, }: {
    path: string;
    persistedFilters?: Array<keyof APMQueryParams>;
    query?: APMQueryParams;
    pathParams?: Record<string, string>;
}): string;
/**
 * Get an APM link for a path.
 */
export declare function getLegacyApmHref({ basePath, path, search, query, }: {
    basePath: IBasePath;
    path?: string;
    search?: string;
    query?: APMQueryParams;
}): string;
export {};
