import type { Logger } from '@kbn/core/server';
import type { AlertDetailsContextualInsightsHandler } from '@kbn/observability-plugin/server/services';
import type { APMRouteHandlerResources } from '../../apm_routes/register_apm_server_routes';
import type { APMCore } from '../../typings';
export declare const getAlertDetailsContextHandler: (apmCore: APMCore, resourcePlugins: APMRouteHandlerResources["plugins"], logger: Logger) => AlertDetailsContextualInsightsHandler;
