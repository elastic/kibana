import type { ObservabilityRuleTypeRegistry } from '@kbn/observability-plugin/public';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { ConfigSchema } from '..';
import type { ApmPluginSetupDeps, ApmPluginStartDeps, ApmServices } from '../plugin';
import type { KibanaEnvContext } from '../context/kibana_environment_context/kibana_environment_context';
/**
 * This module is rendered asynchronously in the Kibana platform.
 */
export declare const renderApp: ({ coreStart, pluginsSetup, appMountParameters, config, pluginsStart, observabilityRuleTypeRegistry, apmServices, kibanaEnvironment, }: {
    coreStart: CoreStart;
    pluginsSetup: ApmPluginSetupDeps;
    appMountParameters: AppMountParameters;
    config: ConfigSchema;
    pluginsStart: ApmPluginStartDeps;
    observabilityRuleTypeRegistry: ObservabilityRuleTypeRegistry;
    apmServices: ApmServices;
    kibanaEnvironment: KibanaEnvContext;
}) => () => void;
