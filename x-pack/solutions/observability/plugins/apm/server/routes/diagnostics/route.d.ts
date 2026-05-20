import type { FieldCapsResponse, IndicesDataStream, IndicesGetIndexTemplateIndexTemplateItem, IndicesGetResponse, IngestGetPipelineResponse, SecurityHasPrivilegesPrivileges } from '@elastic/elasticsearch/lib/api/types';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type * as t from 'io-ts';
import type { ApmEvent } from './bundle/get_apm_events';
import type { ServiceMapDiagnosticResponse } from '../../../common/service_map_diagnostic_types';
export interface IndiciesItem {
    index: string;
    fieldMappings: {
        isValid: boolean;
        invalidType?: string;
    };
    ingestPipeline: {
        isValid?: boolean;
        id?: string;
    };
    dataStream?: string;
    isValid: boolean;
}
export type DiagnosticsBundle = Promise<{
    esResponses: {
        existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
        fieldCaps: FieldCapsResponse;
        indices: IndicesGetResponse;
        ingestPipelines: IngestGetPipelineResponse;
    };
    diagnosticsPrivileges: {
        index: Record<string, SecurityHasPrivilegesPrivileges>;
        cluster: Record<string, boolean>;
        hasAllClusterPrivileges: boolean;
        hasAllIndexPrivileges: boolean;
        hasAllPrivileges: boolean;
    };
    apmIndices: APMIndices;
    apmIndexTemplates: Array<{
        name: string;
        isNonStandard: boolean;
        exists: boolean;
    }>;
    fleetPackageInfo: {
        isInstalled: boolean;
        version?: string;
    };
    kibanaVersion: string;
    elasticsearchVersion: string;
    apmEvents: ApmEvent[];
    invalidIndices: IndiciesItem[];
    validIndices: IndiciesItem[];
    dataStreams: IndicesDataStream[];
    nonDataStreamIndices: string[];
    indexTemplatesByIndexPattern: Array<{
        indexPattern: string;
        indexTemplates: Array<{
            priority: number | undefined;
            isNonStandard: boolean;
            templateIndexPatterns: string[];
            templateName: string;
        }>;
    }>;
    params: {
        start: number;
        end: number;
    };
}>;
export declare const diagnosticsRepository: {
    "POST /internal/apm/diagnostics/service-map": import("@kbn/server-route-repository-utils").ServerRoute<"POST /internal/apm/diagnostics/service-map", t.TypeC<{
        body: t.IntersectionC<[t.TypeC<{
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>, t.TypeC<{
            sourceNode: t.StringC;
            destinationNode: t.StringC;
        }>, t.PartialC<{
            traceId: t.StringC;
        }>]>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, ServiceMapDiagnosticResponse, import("../typings").APMRouteCreateOptions>;
    "GET /internal/apm/diagnostics": import("@kbn/server-route-repository-utils").ServerRoute<"GET /internal/apm/diagnostics", t.PartialC<{
        query: t.PartialC<{
            kuery: t.StringC;
            start: t.Type<number, string, unknown>;
            end: t.Type<number, string, unknown>;
        }>;
    }>, import("../apm_routes/register_apm_server_routes").APMRouteHandlerResources, {
        esResponses: {
            existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
            fieldCaps?: FieldCapsResponse;
            indices?: IndicesGetResponse;
            ingestPipelines?: IngestGetPipelineResponse;
        };
        diagnosticsPrivileges: {
            index: Record<string, SecurityHasPrivilegesPrivileges>;
            cluster: Record<string, boolean>;
            hasAllClusterPrivileges: boolean;
            hasAllIndexPrivileges: boolean;
            hasAllPrivileges: boolean;
        };
        apmIndices: APMIndices;
        apmIndexTemplates: Array<{
            name: string;
            isNonStandard: boolean;
            exists: boolean;
        }>;
        fleetPackageInfo: {
            isInstalled: boolean;
            version?: string;
        };
        kibanaVersion: string;
        elasticsearchVersion: string;
        apmEvents: ApmEvent[];
        invalidIndices?: IndiciesItem[];
        validIndices?: IndiciesItem[];
        dataStreams: IndicesDataStream[];
        nonDataStreamIndices: string[];
        indexTemplatesByIndexPattern: Array<{
            indexPattern: string;
            indexTemplates: Array<{
                priority: number | undefined;
                isNonStandard: boolean;
                templateIndexPatterns: string[];
                templateName: string;
            }>;
        }>;
        params: {
            start: number;
            end: number;
            kuery?: string;
        };
    }, import("../typings").APMRouteCreateOptions>;
};
