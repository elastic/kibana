import type { AggregationsTopHitsAggregation } from '@elastic/elasticsearch/lib/api/types';
export interface SourceDoc {
    [key: string]: string | string[] | SourceDoc;
}
export declare function getApmAlertSourceFieldsAgg(topHitsOpts?: AggregationsTopHitsAggregation): {
    source_fields: {
        top_hits: {
            docvalue_fields?: (import("@elastic/elasticsearch/lib/api/types").QueryDslFieldAndFormat | import("@elastic/elasticsearch/lib/api/types").Field)[];
            explain?: boolean;
            fields?: (import("@elastic/elasticsearch/lib/api/types").QueryDslFieldAndFormat | import("@elastic/elasticsearch/lib/api/types").Field)[];
            from?: import("@elastic/elasticsearch/lib/api/types").integer;
            highlight?: import("@elastic/elasticsearch/lib/api/types").SearchHighlight;
            script_fields?: Record<string, import("@elastic/elasticsearch/lib/api/types").ScriptField>;
            size: import("@elastic/elasticsearch/lib/api/types").integer;
            sort?: import("@elastic/elasticsearch/lib/api/types").Sort;
            _source: import("@elastic/elasticsearch/lib/api/types").SearchSourceConfig;
            stored_fields?: import("@elastic/elasticsearch/lib/api/types").Fields;
            track_scores?: boolean;
            version?: boolean;
            seq_no_primary_term?: boolean;
            field?: import("@elastic/elasticsearch/lib/api/types").Field;
            missing?: import("@elastic/elasticsearch/lib/api/types").AggregationsMissing;
            script?: import("@elastic/elasticsearch/lib/api/types").Script | import("@elastic/elasticsearch/lib/api/types").ScriptSource;
        };
    };
};
interface AggResultBucket {
    source_fields: {
        hits: {
            hits: Array<{
                _source: any;
            }>;
        };
    };
}
export declare function getApmAlertSourceFields(bucket?: AggResultBucket): Record<string, string | object>;
export declare function flattenSourceDoc(val: SourceDoc | string, path?: string[]): Record<string, string | object>;
export {};
