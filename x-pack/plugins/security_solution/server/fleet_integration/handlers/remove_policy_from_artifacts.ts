/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';

import { ExceptionListClient } from '../../../../lists/server';
import { PostPackagePolicyDeleteCallback } from '../../../../fleet/server';
import { ALL_ENDPOINT_ARTIFACT_LIST_IDS } from '../../../common/endpoint/service/artifacts/constants';

/**
 * Removes policy from artifacts
 */
export const removePolicyFromArtifacts = async (
  exceptionsClient: ExceptionListClient,
  policy: Parameters<PostPackagePolicyDeleteCallback>[0][0]
) => {
  let page = 1;

  const findArtifactsByPolicy = (currentPage: number) => {
    return exceptionsClient.findExceptionListsItem({
      listId: ALL_ENDPOINT_ARTIFACT_LIST_IDS as string[],
      filter: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(
        () => `exception-list-agnostic.attributes.tags:"policy:${policy.id}"`
      ),
      namespaceType: ALL_ENDPOINT_ARTIFACT_LIST_IDS.map(() => 'agnostic'),
      page: currentPage,
      perPage: 50,
      sortField: undefined,
      sortOrder: undefined,
    });
  };

  let findResponse = await findArtifactsByPolicy(page);
  if (!findResponse) {
    return;
  }
  const artifacts = findResponse.data;

  while (findResponse && (artifacts.length < findResponse.total || findResponse.data.length)) {
    page += 1;
    findResponse = await findArtifactsByPolicy(page);
    if (findResponse) {
      artifacts.push(...findResponse.data);
    }
  }

  await pMap(
    artifacts,
    (artifact) =>
      exceptionsClient.updateExceptionListItem({
        ...artifact,
        itemId: artifact.item_id,
        namespaceType: artifact.namespace_type,
        osTypes: artifact.os_types,
        tags: artifact.tags.filter((currentPolicy) => currentPolicy !== `policy:${policy.id}`),
      }),
    {
      /** Number of concurrent executions till the end of the artifacts array */
      concurrency: 5,
      /** When set to false, instead of stopping when a promise rejects, it will wait for all the promises to
       * settle and then reject with an aggregated error containing all the errors from the rejected promises. */
      stopOnError: false,
    }
  );
};
