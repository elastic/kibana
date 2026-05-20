import type { DataView } from '@kbn/data-views-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/common/config_schema';
export declare function getApmDataViewIndexPattern(): Promise<{
    apmDataViewIndexPattern: string;
    apmIndices: APMIndices;
}>;
export declare function useAdHocApmDataView(): {
    dataView: DataView | undefined;
    apmIndices: Readonly<{} & {
        error: string;
        span: string;
        onboarding: string;
        metric: string;
        transaction: string;
        sourcemap: string;
    }> | undefined;
};
