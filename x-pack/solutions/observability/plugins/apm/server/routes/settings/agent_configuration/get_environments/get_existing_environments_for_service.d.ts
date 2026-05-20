import type { APMInternalESClient } from '../../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function getExistingEnvironmentsForService({ serviceName, internalESClient, size, }: {
    serviceName: string | undefined;
    internalESClient: APMInternalESClient;
    size: number;
}): Promise<string[]>;
