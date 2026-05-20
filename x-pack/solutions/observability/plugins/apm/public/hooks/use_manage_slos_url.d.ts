import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { SloListLocatorParams } from '@kbn/deeplinks-observability';
interface ManageSlosUrlParams {
    serviceName?: string;
    environment?: string;
}
export declare function getManageSlosUrl(sloListLocator: LocatorPublic<SloListLocatorParams> | undefined, params?: ManageSlosUrlParams): string | undefined;
export declare function useManageSlosUrl(overrides?: ManageSlosUrlParams): string | undefined;
export {};
