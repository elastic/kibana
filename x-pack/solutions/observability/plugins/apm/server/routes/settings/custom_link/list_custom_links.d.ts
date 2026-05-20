import type * as t from 'io-ts';
import type { CustomLink } from '../../../../common/custom_link/custom_link_types';
import type { filterOptionsRt } from './custom_link_types';
import type { APMInternalESClient } from '../../../lib/helpers/create_es_client/create_internal_es_client';
export declare function listCustomLinks({ internalESClient, filters, }: {
    internalESClient: APMInternalESClient;
    filters?: t.TypeOf<typeof filterOptionsRt>;
}): Promise<CustomLink[]>;
