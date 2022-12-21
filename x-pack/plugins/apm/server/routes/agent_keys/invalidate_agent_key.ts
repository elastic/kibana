/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ApmPluginRequestHandlerContext } from '../typings';

export async function invalidateAgentKey({
  context,
  id,
  isAdmin,
}: {
  context: ApmPluginRequestHandlerContext;
  id: string;
  isAdmin: boolean;
}) {
  const esClient = (await context.core).elasticsearch.client;
  const { invalidated_api_keys: invalidatedAgentKeys } =
    await esClient.asCurrentUser.security.invalidateApiKey({
      body: { ids: [id], owner: !isAdmin },
    });

  return {
    invalidatedAgentKeys,
  };
}
