export declare function useDiagnosticsContext(): {
    diagnosticsBundle?: {
        esResponses: {
            existingIndexTemplates: import("@elastic/elasticsearch/lib/api/types").IndicesGetIndexTemplateIndexTemplateItem[];
            fieldCaps?: import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse;
            indices?: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse;
            ingestPipelines?: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse;
        };
        diagnosticsPrivileges: {
            index: Record<string, import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesPrivileges>;
            cluster: Record<string, boolean>;
            hasAllClusterPrivileges: boolean;
            hasAllIndexPrivileges: boolean;
            hasAllPrivileges: boolean;
        };
        apmIndices: import("../../../../../../../../../platform/plugins/shared/apm_sources_access/server").APMIndices;
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
        apmEvents: import("../../../../../server/routes/diagnostics/bundle/get_apm_events").ApmEvent[];
        invalidIndices?: import("../../../../../server/routes/diagnostics/route").IndiciesItem[];
        validIndices?: import("../../../../../server/routes/diagnostics/route").IndiciesItem[];
        dataStreams: import("@elastic/elasticsearch/lib/api/types").IndicesDataStream[];
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
    } & {
        _inspect?: import("../../../../../../observability/typings/common").InspectResponse;
    };
    setImportedDiagnosticsBundle: (bundle: ({
        esResponses: {
            existingIndexTemplates: import("@elastic/elasticsearch/lib/api/types").IndicesGetIndexTemplateIndexTemplateItem[];
            fieldCaps?: import("@elastic/elasticsearch/lib/api/types").FieldCapsResponse;
            indices?: import("@elastic/elasticsearch/lib/api/types").IndicesGetResponse;
            ingestPipelines?: import("@elastic/elasticsearch/lib/api/types").IngestGetPipelineResponse;
        };
        diagnosticsPrivileges: {
            index: Record<string, import("@elastic/elasticsearch/lib/api/types").SecurityHasPrivilegesPrivileges>;
            cluster: Record<string, boolean>;
            hasAllClusterPrivileges: boolean;
            hasAllIndexPrivileges: boolean;
            hasAllPrivileges: boolean;
        };
        apmIndices: import("../../../../../../../../../platform/plugins/shared/apm_sources_access/server").APMIndices;
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
        apmEvents: import("../../../../../server/routes/diagnostics/bundle/get_apm_events").ApmEvent[];
        invalidIndices?: import("../../../../../server/routes/diagnostics/route").IndiciesItem[];
        validIndices?: import("../../../../../server/routes/diagnostics/route").IndiciesItem[];
        dataStreams: import("@elastic/elasticsearch/lib/api/types").IndicesDataStream[];
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
    } & {
        _inspect?: import("../../../../../../observability/typings/common").InspectResponse;
    }) | undefined) => void;
    status: import("../../../../hooks/use_fetcher").FETCH_STATUS;
    isImported?: boolean;
    refetch: () => void;
};
