import type { CoreSetup, DeprecationsDetails, GetDeprecationsContext } from '@kbn/core/server';
import type { DeprecationApmDeps } from '.';
export declare function getDeprecationsInfo({ esClient }: GetDeprecationsContext, core: CoreSetup, apmDeps: DeprecationApmDeps): Promise<DeprecationsDetails[]>;
