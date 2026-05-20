import type { CoreStart, Logger } from '@kbn/core/server';
export declare function createApmSourceMapApiKey({ coreStart, logger, packagePolicyId, }: {
    coreStart: CoreStart;
    logger: Logger;
    packagePolicyId: string;
}): Promise<string>;
export declare function createApmAgentConfigApiKey({ coreStart, logger, packagePolicyId, }: {
    coreStart: CoreStart;
    logger: Logger;
    packagePolicyId: string;
}): Promise<string>;
