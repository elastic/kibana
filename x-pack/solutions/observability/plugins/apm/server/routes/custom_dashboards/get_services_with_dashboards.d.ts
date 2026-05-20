import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import type { SavedApmCustomDashboard } from '../../../common/custom_dashboards';
export declare function getServicesWithDashboards({ apmEventClient, allLinkedCustomDashboards, serviceName, start, end, }: {
    apmEventClient: APMEventClient;
    allLinkedCustomDashboards: SavedApmCustomDashboard[];
    serviceName: string;
    start: number;
    end: number;
}): Promise<SavedApmCustomDashboard[]>;
