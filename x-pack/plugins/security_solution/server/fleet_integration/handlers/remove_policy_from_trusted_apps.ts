/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENDPOINT_TRUSTED_APPS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { ExceptionListClient } from '../../../../lists/server';
import { PostPackagePolicyDeleteCallback } from '../../../../fleet/server';

/**
 * Removes policy from trusted apps
 */
export const removePolicyFromTrustedApps = async (
  exceptionsClient: ExceptionListClient,
  policy: Parameters<PostPackagePolicyDeleteCallback>[0][0]
) => {
  let page = 1;

  const findTrustedAppsByPolicy = async (currentPage: number) => {
    return exceptionsClient.findExceptionListItem({
      listId: ENDPOINT_TRUSTED_APPS_LIST_ID,
      filter: `exception-list-agnostic.attributes.tags:"policy:${policy.id}"`,
      namespaceType: 'agnostic',
      page: currentPage,
      perPage: 50,
      sortField: undefined,
      sortOrder: undefined,
    });
  };

  let findResponse = await findTrustedAppsByPolicy(page);
  if (!findResponse) {
    return;
  }
  const trustedApps = findResponse.data;

  while (findResponse && (trustedApps.length < findResponse.total || findResponse.data.length)) {
    page += 1;
    findResponse = await findTrustedAppsByPolicy(page);
    if (findResponse) {
      trustedApps.push(...findResponse.data);
    }
  }

  const updates = [];
  for (const trustedApp of trustedApps) {
    updates.push(
      exceptionsClient.updateExceptionListItem({
        ...trustedApp,
        itemId: trustedApp.item_id,
        namespaceType: trustedApp.namespace_type,
        osTypes: trustedApp.os_types,
        tags: trustedApp.tags.filter((currentPolicy) => currentPolicy !== `policy:${policy.id}`),
      })
    );
  }

  await Promise.all(updates);
};
