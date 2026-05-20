import type { IBasePath } from '@kbn/core/public';
import type { LocatorPublic } from '@kbn/share-plugin/public';
import { type LogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import { type AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import type { APIReturnType } from '../../../../../services/rest/create_call_apm_api';
import type { Action } from '../../../../shared/transaction_action_menu/sections_helper';
type InstaceDetails = APIReturnType<'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}'>;
export declare function getMenuSections({ instanceDetails, basePath, onFilterByInstanceClick, metricsHref, logsLocator, assetDetailsLocator, discoverLocator, infraLinksAvailable, metricsIndices, }: {
    instanceDetails: InstaceDetails;
    basePath: IBasePath;
    onFilterByInstanceClick: () => void;
    metricsHref: string;
    logsLocator: LocatorPublic<LogsLocatorParams>;
    assetDetailsLocator?: AssetDetailsLocator;
    discoverLocator?: LocatorPublic<SerializableRecord>;
    infraLinksAvailable: boolean;
    metricsIndices?: string;
}): {
    actions: Action[];
    key: string;
    title?: string;
    subtitle?: string;
}[][];
export {};
