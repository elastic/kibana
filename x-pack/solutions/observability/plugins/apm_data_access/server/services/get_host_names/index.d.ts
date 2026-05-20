import type { estypes } from '@elastic/elasticsearch';
import { type DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import { type TimeRangeMetadata } from '../../../common';
import type { ApmDataAccessServicesParams } from '../get_services';
export interface HostNamesRequest {
    query?: estypes.QueryDslQueryContainer;
    kuery?: string;
    start: number;
    end: number;
    size?: number;
    documentSources: TimeRangeMetadata['sources'];
    schema: DataSchemaFormat;
}
export declare function createGetHostNames({ apmEventClient }: ApmDataAccessServicesParams): ({ start, end, size, query, documentSources, schema, }: HostNamesRequest) => Promise<string[]>;
