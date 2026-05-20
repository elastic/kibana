import type { estypes } from '@elastic/elasticsearch';
import type { ESSearchResponse, ESSearchRequest } from '@kbn/es-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { type APMRouteHandlerResources } from '../../../../routes/apm_routes/register_apm_server_routes';
export type APMIndexDocumentParams<T> = estypes.IndexRequest<T>;
export type APMInternalESClient = Awaited<ReturnType<typeof createInternalESClientWithResources>>;
export declare function createInternalESClientWithResources({ params, request, context, }: APMRouteHandlerResources): Promise<{
    search: <TDocument = unknown, TSearchRequest extends ESSearchRequest = estypes.SearchRequest>(operationName: string, params: TSearchRequest) => Promise<ESSearchResponse<TDocument, TSearchRequest>>;
    index: <T>(operationName: string, params: APMIndexDocumentParams<T>) => Promise<estypes.WriteResponseBase>;
    delete: (operationName: string, params: estypes.DeleteRequest) => Promise<{
        result: string;
    }>;
    indicesCreate: (operationName: string, params: estypes.IndicesCreateRequest) => Promise<estypes.IndicesCreateResponse>;
}>;
export declare function createInternalESClient({ debug, request, elasticsearchClient, }: {
    debug: boolean;
    request?: APMRouteHandlerResources['request'];
    elasticsearchClient: ElasticsearchClient;
}): Promise<{
    search: <TDocument = unknown, TSearchRequest extends ESSearchRequest = estypes.SearchRequest>(operationName: string, params: TSearchRequest) => Promise<ESSearchResponse<TDocument, TSearchRequest>>;
    index: <T>(operationName: string, params: APMIndexDocumentParams<T>) => Promise<estypes.WriteResponseBase>;
    delete: (operationName: string, params: estypes.DeleteRequest) => Promise<{
        result: string;
    }>;
    indicesCreate: (operationName: string, params: estypes.IndicesCreateRequest) => Promise<estypes.IndicesCreateResponse>;
}>;
