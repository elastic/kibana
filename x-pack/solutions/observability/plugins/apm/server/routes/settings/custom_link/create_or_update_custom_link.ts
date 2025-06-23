/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_CUSTOM_LINK_INDEX } from '@kbn/apm-sources-access-plugin/server';
import type { CustomLink, CustomLinkES } from '../../../../common/custom_link/custom_link_types';
import { toESFormat } from './helper';
import type {
  APMIndexDocumentParams,
  APMInternalESClient,
} from '../../../lib/helpers/create_es_client/create_internal_es_client';

export function createOrUpdateCustomLink({
  customLinkId,
  customLink,
  internalESClient,
}: {
  customLinkId?: string;
  customLink: Omit<CustomLink, '@timestamp'>;
  internalESClient: APMInternalESClient;
}) {
  const params: APMIndexDocumentParams<CustomLinkES> = {
    refresh: 'wait_for' as const,
    index: APM_CUSTOM_LINK_INDEX,
    document: {
      '@timestamp': Date.now(),
      ...toESFormat(customLink),
    },
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (customLinkId) {
    params.id = customLinkId;
  }

  return internalESClient.index('create_or_update_custom_link', params);
}
