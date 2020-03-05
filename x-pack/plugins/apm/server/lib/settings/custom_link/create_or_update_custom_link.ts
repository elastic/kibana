/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';
import { filterOptions } from '../../../routes/settings/custom_link';
import { APMIndexDocumentParams } from '../../helpers/es_client';
import { Setup } from '../../helpers/setup_request';
import { CustomLink } from './custom_link_types';

export async function createOrUpdateCustomLink({
  customLinkId,
  customLink,
  setup
}: {
  customLinkId?: string;
  customLink: Omit<CustomLink, '@timestamp'>;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params: APMIndexDocumentParams<CustomLink> = {
    refresh: true,
    index: indices.apmCustomLinkIndex,
    body: {
      '@timestamp': Date.now(),
      label: customLink.label,
      url: customLink.url,
      ...pick(customLink, filterOptions)
    }
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (customLinkId) {
    params.id = customLinkId;
  }

  return internalClient.index(params);
}
