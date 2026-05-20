import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function deleteCustomLink({ customLinkId, internalESClient, }: {
    customLinkId: string;
    internalESClient: APMInternalESClient;
}): Promise<{
    result: string;
}>;
