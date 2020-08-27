/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../../common/endpoint/types';
import { mockTreeWithNoProcessEvents } from '../../mocks/resolver_tree';
import { DataAccessLayer } from '../../types';

type EmptiableRequests = 'relatedEvents' | 'resolverTree' | 'entities' | 'indexPatterns';

interface Metadata<T> {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: T;
}

/**
 * A simple mock dataAccessLayer that allows you to control whether a request comes back with data or empty.
 */
export function emptifyMock<T>(
  {
    metadata,
    dataAccessLayer,
  }: {
    dataAccessLayer: DataAccessLayer;
    metadata: Metadata<T>;
  },
  dataShouldBeEmpty?: EmptiableRequests | EmptiableRequests[]
): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata<T>;
} {
  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        return dataShouldBeEmpty?.includes('relatedEvents')
          ? Promise.resolve({
              entityID,
              events: [],
              nextEvent: null,
            })
          : dataAccessLayer.relatedEvents(entityID);
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(): Promise<ResolverTree> {
        return dataShouldBeEmpty?.includes('resolverTree')
          ? Promise.resolve(mockTreeWithNoProcessEvents())
          : // @ts-ignore - ignore the argument requirement for dataAccessLayer
            Promise.resolve(dataAccessLayer.resolverTree());
      },

      /**
       * Get an array of index patterns that contain events.
       */
      indexPatterns(): string[] {
        return dataShouldBeEmpty?.includes('indexPatterns') ? [] : dataAccessLayer.indexPatterns();
      },

      /**
       * Get entities matching a document.
       */
      async entities(): Promise<ResolverEntityIndex> {
        return dataShouldBeEmpty?.includes('entities')
          ? Promise.resolve([])
          : // @ts-ignore - ignore the argument requirement for dataAccessLayer
            dataAccessLayer.entities();
      },
    },
  };
}
