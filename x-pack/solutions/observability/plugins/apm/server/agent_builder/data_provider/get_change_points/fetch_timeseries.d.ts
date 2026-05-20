import type { AggregationsAggregationContainer, QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationResultOf, AggregationResultOfMap } from '@kbn/es-types';
import type { Unionize } from 'utility-types';
import type { ApmDocumentType } from '../../../../common/document_type';
import type { RollupInterval } from '../../../../common/rollup';
import type { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
type ChangePointResult = AggregationResultOf<{
    change_point: any;
}, unknown>;
type ValueAggregationMap = Record<'value', Unionize<Pick<Required<AggregationsAggregationContainer>, 'min' | 'max' | 'sum' | 'bucket_script' | 'avg'>>>;
interface ApmFetchedTimeseries<T extends ValueAggregationMap> {
    groupBy: string;
    data: Array<{
        key: number;
        key_as_string: string;
        doc_count: number;
    } & AggregationResultOfMap<T, unknown>>;
    change_point: ChangePointResult;
    value: number | null;
    unit: string;
}
export interface FetchSeriesProps<T extends ValueAggregationMap> {
    apmEventClient: APMEventClient;
    operationName: string;
    documentType: ApmDocumentType;
    rollupInterval: RollupInterval;
    intervalString: string;
    start: number;
    end: number;
    filter?: QueryDslQueryContainer[];
    groupByFields: string[];
    aggs: T;
    unit: 'ms' | 'rpm' | '%';
}
export declare function fetchSeries<T extends ValueAggregationMap>({ apmEventClient, operationName, documentType, rollupInterval, intervalString, start, end, filter, groupByFields, aggs, unit, }: FetchSeriesProps<T>): Promise<Array<ApmFetchedTimeseries<T>>>;
export {};
