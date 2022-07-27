/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_QUERY } from '../../../common/constants';
import { KubernetesCollection, QueryDslQueryContainerBool, TreeNavSelection } from '../../types';

export const KUBERNETES_COLLECTION_FIELDS = {
  [KubernetesCollection.cluster]: 'orchestrator.cluster.name',
  [KubernetesCollection.namespace]: 'orchestrator.namespace',
  [KubernetesCollection.node]: 'cloud.instance.name',
  [KubernetesCollection.pod]: 'orchestrator.resource.name',
  [KubernetesCollection.containerImage]: 'container.image.name',
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
