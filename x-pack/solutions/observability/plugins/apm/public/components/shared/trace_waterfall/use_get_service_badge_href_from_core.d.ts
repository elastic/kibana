import type { CoreStart } from '@kbn/core/public';
import type { WaterfallGetServiceBadgeHref } from '../../../../common/waterfall/typings';
export declare function useGetServiceBadgeHrefFromCore(core: CoreStart, rangeFrom: string, rangeTo: string): WaterfallGetServiceBadgeHref;
