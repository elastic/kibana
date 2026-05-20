import type { Logger } from '@kbn/core/server';
import type { DataView, DataViewsService } from '@kbn/data-views-plugin/common';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { APMRouteHandlerResources } from '../apm_routes/register_apm_server_routes';
export type CreateDataViewResponse = Promise<{
    created: boolean;
    dataView: DataView;
} | {
    created: boolean;
    reason?: string;
}>;
export declare function createOrUpdateStaticDataView({ dataViewService, resources, apmEventClient, spaceId, logger, }: {
    dataViewService: DataViewsService;
    resources: APMRouteHandlerResources;
    apmEventClient: APMEventClient;
    spaceId: string;
    logger: Logger;
}): CreateDataViewResponse;
