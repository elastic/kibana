/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { APMIndexDocumentParams } from '../../helpers/es_client';
import { Setup } from '../../helpers/setup_request';
import { CustomAction } from './custom_action_types';

export async function createOrUpdateCustomAction({
  customActionId,
  customAction,
  setup
}: {
  customActionId?: string;
  customAction: Omit<CustomAction, '@timestamp'>;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;

  const params: APMIndexDocumentParams<CustomAction> = {
    refresh: true,
    index: indices.apmCustomActionIndex,
    body: {
      '@timestamp': Date.now(),
      label: customAction.label,
      url: customAction.url,
      filters: customAction.filters,
      actionId: customAction.actionId
    }
  };

  // by specifying an id elasticsearch will delete the previous doc and insert the updated doc
  if (customActionId) {
    params.id = customActionId;
  }

  return internalClient.index(params);
}
