/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CustomAction } from './custom_action_types';
import { Setup } from '../../helpers/setup_request';

export async function listCustomActions({ setup }: { setup: Setup }) {
  const { internalClient, indices } = setup;
  const params = {
    index: indices.apmCustomActionIndex,
    size: 500
  };
  const resp = await internalClient.search<CustomAction>(params);
  return resp.hits.hits.map(item => ({
    id: item._id,
    ...item._source
  }));
}
