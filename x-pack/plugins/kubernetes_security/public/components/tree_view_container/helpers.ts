/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CLOUD_INSTANCE_NAME,
  CONTAINER_IMAGE_NAME,
  DEFAULT_QUERY,
  ORCHESTRATOR_CLUSTER_ID,
  ORCHESTRATOR_NAMESPACE,
  ORCHESTRATOR_RESOURCE_ID,
} from '../../../common/constants';
import { KubernetesCollection, QueryDslQueryContainerBool, TreeNavSelection } from '../../types';

export const KUBERNETES_COLLECTION_FIELDS = {
  [KubernetesCollection.cluster]: ORCHESTRATOR_CLUSTER_ID,
  [KubernetesCollection.namespace]: ORCHESTRATOR_NAMESPACE,
  [KubernetesCollection.node]: CLOUD_INSTANCE_NAME,
  [KubernetesCollection.pod]: ORCHESTRATOR_RESOURCE_ID,
  [KubernetesCollection.containerImage]: CONTAINER_IMAGE_NAME,
};

export const addTreeNavSelectionToFilterQuery = (
  filterQuery: string | undefined,
  treeNavSelection: TreeNavSelection
) => {
  let validFilterQuery = DEFAULT_QUERY;

  try {
    const parsedFilterQuery: QueryDslQueryContainerBool = JSON.parse(filterQuery || '{}');
    if (!(parsedFilterQuery?.bool?.filter && Array.isArray(parsedFilterQuery.bool.filter))) {
      throw new Error('Invalid filter query');
    }
    parsedFilterQuery.bool.filter.push(
      ...Object.keys(treeNavSelection).map((collectionKey) => {
        const collection = collectionKey as KubernetesCollection;
        return {
          bool: {
            should: [
              {
                match: {
                  [KUBERNETES_COLLECTION_FIELDS[collection]]: treeNavSelection[collection],
                },
              },
            ],
          },
        };
      })
    );
    validFilterQuery = JSON.stringify(parsedFilterQuery);
  } catch {
    // no-op since validFilterQuery is initialized to be DEFAULT_QUERY
  }

  return validFilterQuery;
};
