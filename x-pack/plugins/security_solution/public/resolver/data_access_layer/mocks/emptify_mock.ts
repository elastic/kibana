/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ResolverNode, SafeResolverEvent } from './../../../../common/endpoint/types/index';

import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../../common/endpoint/types';
import { mockTreeWithNoProcessEvents } from '../../mocks/resolver_tree';
import { DataAccessLayer } from '../../types';

type EmptiableRequests =
  | 'relatedEvents'
  | 'resolverTree'
  | 'entities'
  | 'eventsWithEntityIDAndCategory'
  | 'event'
  | 'nodeData';

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
  dataShouldBeEmpty: EmptiableRequests[]
): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata<T>;
} {
  return {
    metadata,
    dataAccessLayer: {
      ...dataAccessLayer,
      /**
       * Fetch related events for an entity ID
       */
      async relatedEvents(...args): Promise<ResolverRelatedEvents> {
        return dataShouldBeEmpty.includes('relatedEvents')
          ? Promise.resolve({
              entityID: args[0].entityID,
              events: [],
              nextEvent: null,
            })
          : dataAccessLayer.relatedEvents(...args);
      },

      async eventsWithEntityIDAndCategory(
        ...args
      ): Promise<{
        events: SafeResolverEvent[];
        nextEvent: string | null;
      }> {
        return dataShouldBeEmpty.includes('eventsWithEntityIDAndCategory')
          ? {
              events: [],
              nextEvent: null,
            }
          : dataAccessLayer.eventsWithEntityIDAndCategory(...args);
      },

      async nodeData(...args): Promise<SafeResolverEvent[]> {
        return dataShouldBeEmpty.includes('nodeData') ? [] : dataAccessLayer.nodeData(...args);
      },

      async event(...args): Promise<SafeResolverEvent | null> {
        return dataShouldBeEmpty.includes('event') ? null : dataAccessLayer.event(...args);
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      async resolverTree(...args): Promise<ResolverNode[]> {
        return dataShouldBeEmpty.includes('resolverTree')
          ? Promise.resolve(mockTreeWithNoProcessEvents())
          : dataAccessLayer.resolverTree(...args);
      },

      /**
       * Get entities matching a document.
       */
      async entities(...args): Promise<ResolverEntityIndex> {
        return dataShouldBeEmpty.includes('entities')
          ? Promise.resolve([])
          : dataAccessLayer.entities(...args);
      },
    },
  };
}
