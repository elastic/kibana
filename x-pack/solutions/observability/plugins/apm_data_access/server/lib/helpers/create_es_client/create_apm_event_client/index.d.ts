import type { EqlSearchRequest, FieldCapsRequest, FieldCapsResponse, TermsEnumRequest, TermsEnumResponse } from '@elastic/elasticsearch/lib/api/types';
import type { SearchRequest as ESSearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, KibanaRequest } from '@kbn/core/server';
import type { InferSearchResponseOf } from '@kbn/es-types';
import type { ProcessorEvent } from '@kbn/apm-types-shared';
import type { ValuesType } from 'utility-types';
import type { APMError, Metric, Span, Transaction, Event } from '@kbn/apm-types/es_schemas_ui';
import { type InspectResponse, type DataTier } from '@kbn/observability-shared-plugin/common';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ApmDataSource } from '../../../../../common/data_source';
import type { ProcessorEventOfDocumentType } from '../document_type';
export type APMEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
    apm: {
        includeLegacyData?: boolean;
    } & ({
        events: ProcessorEvent[];
    } | {
        sources: ApmDataSource[];
    });
    size: number;
    track_total_hits: boolean | number;
};
export type APMLogEventESSearchRequest = Omit<ESSearchRequest, 'index'> & {
    size: number;
    track_total_hits: boolean | number;
};
type APMEventWrapper<T> = Omit<T, 'index'> & {
    apm: {
        events: ProcessorEvent[];
    };
};
export type APMEventTermsEnumRequest = APMEventWrapper<TermsEnumRequest>;
type APMEventEqlSearchRequest = APMEventWrapper<EqlSearchRequest>;
export type APMEventFieldCapsRequest = APMEventWrapper<FieldCapsRequest>;
type TypeOfProcessorEvent<T extends ProcessorEvent> = {
    [ProcessorEvent.error]: APMError;
    [ProcessorEvent.transaction]: Transaction;
    [ProcessorEvent.span]: Span;
    [ProcessorEvent.metric]: Metric;
}[T];
type TypedLogEventSearchResponse<TParams extends APMLogEventESSearchRequest> = InferSearchResponseOf<Event, TParams>;
type TypedSearchResponse<TParams extends APMEventESSearchRequest> = InferSearchResponseOf<TypeOfProcessorEvent<TParams['apm'] extends {
    events: ProcessorEvent[];
} ? ValuesType<TParams['apm']['events']> : TParams['apm'] extends {
    sources: ApmDataSource[];
} ? ProcessorEventOfDocumentType<ValuesType<TParams['apm']['sources']>['documentType']> : never>, TParams>;
interface TypedMSearchResponse<TParams extends APMEventESSearchRequest> {
    responses: Array<TypedSearchResponse<TParams>>;
}
export interface APMEventClientConfig {
    esClient: ElasticsearchClient;
    debug: boolean;
    request: KibanaRequest;
    indices: APMIndices;
    options: {
        includeFrozen: boolean;
        inspectableEsQueriesMap?: WeakMap<KibanaRequest, InspectResponse>;
        excludedDataTiers?: DataTier[];
        projectRouting?: string;
    };
}
export declare class APMEventClient {
    private readonly esClient;
    private readonly debug;
    private readonly request;
    readonly indices: APMIndices;
    /** @deprecated Use {@link excludedDataTiers} instead.
     * See https://www.elastic.co/guide/en/kibana/current/advanced-options.html **/
    private readonly includeFrozen;
    private readonly excludedDataTiers;
    private readonly inspectableEsQueriesMap?;
    private readonly projectRouting?;
    constructor(config: APMEventClientConfig);
    private callAsyncWithDebug;
    search<TParams extends APMEventESSearchRequest>(operationName: string, params: TParams, options?: {
        skipProcessorEventFilter?: boolean;
    }): Promise<TypedSearchResponse<TParams>>;
    logEventSearch<TParams extends APMLogEventESSearchRequest>(operationName: string, params: TParams): Promise<TypedLogEventSearchResponse<TParams>>;
    msearch<TParams extends APMEventESSearchRequest>(operationName: string, ...allParams: TParams[]): Promise<TypedMSearchResponse<TParams>>;
    eqlSearch(operationName: string, params: APMEventEqlSearchRequest): Promise<import("@elastic/elasticsearch/lib/api/types").EqlSearchResponse<unknown>>;
    fieldCaps(operationName: string, params: APMEventFieldCapsRequest): Promise<FieldCapsResponse>;
    termsEnum(operationName: string, params: APMEventTermsEnumRequest): Promise<TermsEnumResponse>;
    getIndicesFromProcessorEvent(processorEvent: ProcessorEvent): string[];
}
export {};
