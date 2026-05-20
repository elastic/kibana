import type { ApmDataAccessServicesParams } from '../get_services';
import { getDocumentSources, type DocumentSourcesRequest } from './get_document_sources';
export declare function createGetDocumentSources({ apmEventClient }: ApmDataAccessServicesParams): ({ end, kuery, start }: Omit<DocumentSourcesRequest, "apmEventClient">) => Promise<(import("../../../common").ApmDataSource<import("../../../common").ApmDocumentType> & {
    hasDocs: boolean;
    hasDurationSummaryField: boolean;
})[]>;
export { getDocumentSources, type DocumentSourcesRequest };
