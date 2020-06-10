/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CustomLink,
  CustomLinkES,
} from '../../../../common/custom_link/custom_link_types';
import { APMIndexDocumentParams } from '../../helpers/es_client';
import { Setup } from '../../helpers/setup_request';
import { toESFormat } from './helper';

export async function createOrUpdateCustomLink({
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

  return internalClient.index(params);
}
