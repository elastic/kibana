import type { Assign } from '@kbn/utility-types';
import type { ApmUrlParams } from './types';
import type { UrlParamsContext } from './url_params_context';
export declare function useLegacyUrlParams(): Assign<React.ContextType<typeof UrlParamsContext>, {
    urlParams: ApmUrlParams;
}>;
