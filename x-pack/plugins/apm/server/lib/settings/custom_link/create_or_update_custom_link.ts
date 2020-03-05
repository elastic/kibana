/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  TRANSACTION_NAME,
  TRANSACTION_TYPE
} from '../../../../common/elasticsearch_fieldnames';
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
      [SERVICE_NAME]: customLink[SERVICE_NAME],
      [SERVICE_ENVIRONMENT]: customLink[SERVICE_ENVIRONMENT],
      [TRANSACTION_NAME]: customLink[TRANSACTION_NAME],
      [TRANSACTION_TYPE]: customLink[TRANSACTION_TYPE]
    }
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (customLinkId) {
    params.id = customLinkId;
  }

  return internalClient.index(params);
}
