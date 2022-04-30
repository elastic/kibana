/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CustomLink,
  CustomLinkES,
} from '../../../../common/custom_link/custom_link_types';
import { Setup } from '../../../lib/helpers/setup_request';
import { toESFormat } from './helper';
import { APMIndexDocumentParams } from '../../../lib/helpers/create_es_client/create_internal_es_client';

export function createOrUpdateCustomLink({
  customLinkId,
  customLink,
  setup,
}: {
  customLinkId?: string;
  customLink: Omit<CustomLink, '@timestamp'>;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params: APMIndexDocumentParams<CustomLinkES> = {
    refresh: true,
    index: indices.apmCustomLinkIndex,
    body: {
      '@timestamp': Date.now(),
      ...toESFormat(customLink),
    },
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (customLinkId) {
    params.id = customLinkId;
  }

  return internalClient.index('create_or_update_custom_link', params);
}
