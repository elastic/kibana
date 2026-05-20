import type { APMEventClient } from '../lib/helpers/create_es_client/create_apm_event_client';
import { getDocumentTypeConfig } from './get_document_type_config';
export interface ApmDataAccessServicesParams {
    apmEventClient: APMEventClient;
}
export declare function getServices(params: ApmDataAccessServicesParams): {
    getDocumentSources: ({ end, kuery, start }: Omit<import("./get_document_sources").DocumentSourcesRequest, "apmEventClient">) => Promise<(import("../../common").ApmDataSource<import("../../common").ApmDocumentType> & {
        hasDocs: boolean;
        hasDurationSummaryField: boolean;
    })[]>;
    getHostNames: ({ start, end, size, query, documentSources, schema, }: import("./get_host_names").HostNamesRequest) => Promise<string[]>;
    getDocumentTypeConfig: typeof getDocumentTypeConfig;
    getHostServices: ({ start, end, size, filters, documentSources }: import("./get_host_services").HostServicesRequest) => Promise<{
        services: {
            serviceName: string;
            agentName: string | null;
        }[];
    }>;
};
