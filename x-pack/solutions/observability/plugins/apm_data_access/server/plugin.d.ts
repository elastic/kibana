import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin, Logger } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import type { ApmDataAccessPluginSetup, ApmDataAccessPluginStart, ApmDataAccessServerSetupDependencies } from './types';
export declare class ApmDataAccessPlugin implements Plugin<ApmDataAccessPluginSetup, ApmDataAccessPluginStart> {
    config?: APMIndices;
    logger: Logger;
    constructor(initContext: PluginInitializerContext);
    setup(core: CoreSetup, plugins: ApmDataAccessServerSetupDependencies): ApmDataAccessPluginSetup;
    start(_core: CoreStart): ApmDataAccessPluginStart;
    stop(): void;
}
