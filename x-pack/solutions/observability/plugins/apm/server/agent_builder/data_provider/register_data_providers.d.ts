import type { CoreSetup, Logger } from '@kbn/core/server';
import type { APMConfig } from '../..';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';
export declare function registerDataProviders({ core, plugins, config, logger, }: {
    core: CoreSetup<APMPluginStartDependencies>;
    plugins: APMPluginSetupDependencies;
    config: APMConfig;
    logger: Logger;
}): void;
