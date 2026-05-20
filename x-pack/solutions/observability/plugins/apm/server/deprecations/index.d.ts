import type { CoreSetup, Logger } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
export interface DeprecationApmDeps {
    logger: Logger;
    security?: SecurityPluginSetup;
}
export declare const registerDeprecations: ({ core, apmDeps, }: {
    core: CoreSetup;
    apmDeps: DeprecationApmDeps;
}) => void;
