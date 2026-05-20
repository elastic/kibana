import type { Logger } from '@kbn/core/server';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { SavedServiceGroup } from '../../../common/service_groups';
import type { ApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
export declare function getServiceGroupAlerts({ serviceGroups, apmAlertsClient, context, logger, spaceId, }: {
    serviceGroups: SavedServiceGroup[];
    apmAlertsClient: ApmAlertsClient;
    context: ApmPluginRequestHandlerContext;
    logger: Logger;
    spaceId?: string;
}): Promise<Record<string, number>>;
