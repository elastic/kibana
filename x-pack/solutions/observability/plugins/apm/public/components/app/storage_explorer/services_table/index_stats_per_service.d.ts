import React from 'react';
import { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import type { APIReturnType } from '../../../../services/rest/create_call_apm_api';
type StorageExplorerIndicesStats = APIReturnType<'GET /internal/apm/services/{serviceName}/storage_details'>['indicesStats'];
interface Props {
    indicesStats: StorageExplorerIndicesStats;
    status: FETCH_STATUS;
}
export declare function IndexStatsPerService({ indicesStats, status }: Props): React.JSX.Element;
export {};
