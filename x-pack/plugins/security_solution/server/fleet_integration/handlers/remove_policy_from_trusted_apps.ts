/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RequestHandlerContext } from 'kibana/server';
import { without } from 'lodash/fp';

interface DeletePolicy {
  id: string;
  name?: string;
  success: boolean;
}

/**
 * Removes policy from trusted apps
 */
export const removePolicyFromTrustedApps = async (
  context: RequestHandlerContext,
  policy: DeletePolicy
) => {
  const savedObjectsClient = context.core.savedObjects.client;
  let page = 1;

  const findTrustedAppsByPolicy = async (currentPage: number) => {
    return savedObjectsClient.find({
      type: 'exception-list-agnostic',
      search: `policy:${policy.id}`,
      searchFields: ['tags'],
      page: currentPage,
      perPage: 50,
    });
  };

  let findResponse = await findTrustedAppsByPolicy(page);
  const trustedApps = findResponse.saved_objects;

  while (trustedApps.length < findResponse.total || findResponse.saved_objects.length) {
    page += 1;
    findResponse = await findTrustedAppsByPolicy(page);
    trustedApps.concat(findResponse.saved_objects);
  }

  for (const trustedApp of trustedApps) {
    // TODO: do bulk update
    await savedObjectsClient.update('exception-list-agnostic', trustedApp.id, {
      // TODO: There is a ts error here because I'm missing the type in the find response. Where should I pick this type?
      tags: without(trustedApp.attributes.tags, `policy:${policy.id}`),
    });
  }
};
