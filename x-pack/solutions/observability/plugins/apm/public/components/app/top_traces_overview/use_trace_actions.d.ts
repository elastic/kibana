import type { ApmIndexSettingsResponse } from '@kbn/apm-sources-access-plugin/server/routes/settings';
import type { TableActions } from '../../shared/managed_table';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
export type TraceGroup = APIReturnType<'GET /internal/apm/traces'>['items'][number];
interface UseTraceActionsParams {
    kuery: string;
    environment: string;
    rangeFrom: string;
    rangeTo: string;
    indexSettings: ApmIndexSettingsResponse['apmIndexSettings'];
}
export declare function useTraceActions({ kuery, environment, rangeFrom, rangeTo, indexSettings, }: UseTraceActionsParams): TableActions<TraceGroup>;
export {};
