import type { CustomLink } from '../../../../common/custom_link/custom_link_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function createOrUpdateCustomLink({ customLinkId, customLink, internalESClient, }: {
    customLinkId?: string;
    customLink: Omit<CustomLink, '@timestamp'>;
    internalESClient: APMInternalESClient;
}): Promise<import("@elastic/elasticsearch/lib/api/types").WriteResponseBase>;
