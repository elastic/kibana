import type { CoreStart } from '@kbn/core/public';
import type { Environment } from '../../../common/environment_rt';
export interface ServiceMapUrlParams {
    rangeFrom: string;
    rangeTo: string;
    environment?: Environment;
    kuery?: string;
    serviceName?: string;
    serviceGroupId?: string;
    /**
     * Field-value pairs to pre-populate as filter bar pills.
     * Each `field` is used unescaped in a match_phrase query — only pass trusted
     * field names (e.g. TRANSACTION_NAME, TRANSACTION_TYPE constants).
     */
    filterPills?: Array<{
        field: string;
        value: string;
    }>;
}
/**
 * Builds the URL to the full APM service map page with the same context.
 * Used by the embeddable "View full service map" link.
 */
export declare function getServiceMapUrl(core: CoreStart, params: ServiceMapUrlParams): string;
