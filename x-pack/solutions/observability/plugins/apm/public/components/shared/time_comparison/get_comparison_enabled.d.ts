import type { CoreStart } from '@kbn/core/public';
export declare function getComparisonEnabled({ core, urlComparisonEnabled, }: {
    core: CoreStart;
    urlComparisonEnabled?: boolean;
}): boolean;
