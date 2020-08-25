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
import { DataAccessLayer } from '../../types';

interface Metadata {
  /**
   * The `_id` of the document being analyzed.
   */
  databaseDocumentID: string;
  /**
   * A record of entityIDs to be used in tests assertions.
   */
  entityIDs: {};
}

/**
 * A simple mock dataAccessLayer that rejects on any data requests.
 */
export function noResolverDataReturned(): {
  dataAccessLayer: DataAccessLayer;
  metadata: Metadata;
} {
  const metadata: Metadata = {
    databaseDocumentID: '_noDataID',
    entityIDs: {},
  };
  return {
    metadata,
    dataAccessLayer: {
      /**
       * Fetch related events for an entity ID
       */
      relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
        return Promise.reject(Error('Events are unable to be found'));
      },

      /**
       * Fetch a ResolverTree for a entityID
       */
      resolverTree(): Promise<ResolverTree> {
        return Promise.reject(Error('Tree is unable to be found'));
      },

      /**
       * Get an array of index patterns that contain events.
       */
      indexPatterns(): string[] {
        return [];
      },

      /**
       * Get entities matching a document.
       */
      entities(): Promise<ResolverEntityIndex> {
        return Promise.reject(Error('Entities could not be be found'));
      },
    },
  };
}
