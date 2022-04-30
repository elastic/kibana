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
}: {
  context: ApmPluginRequestHandlerContext;
  id: string;
}) {
  const {
    body: { invalidated_api_keys: invalidatedAgentKeys },
  } = await context.core.elasticsearch.client.asCurrentUser.security.invalidateApiKey(
    {
      body: {
        ids: [id],
        owner: true,
      },
    }
  );

  return {
    invalidatedAgentKeys,
  };
}
