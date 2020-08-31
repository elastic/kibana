/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaReactContextValue } from '../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../types';
import { DataAccessLayer } from '../types';
import {
  ResolverRelatedEvents,
  ResolverTree,
  ResolverEntityIndex,
} from '../../../common/endpoint/types';
import { DEFAULT_INDEX_KEY as defaultIndexKey } from '../../../common/constants';

/**
 * The data access layer for resolver. All communication with the Kibana server is done through this object. This object is provided to Resolver. In tests, a mock data access layer can be used instead.
 */
export function dataAccessLayerFactory(
  context: KibanaReactContextValue<StartServices>
): DataAccessLayer {
  const dataAccessLayer: DataAccessLayer = {
    /**
     * Used to get non-process related events for a node.
     */
    async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
      return context.services.http.post(`/api/endpoint/resolver/${entityID}/events`, {
        query: { events: 100 },
      });
    },
    /**
     * Used to get descendant and ancestor process events for a node.
     */
    async resolverTree(entityID: string, signal: AbortSignal): Promise<ResolverTree> {
      return context.services.http.get(`/api/endpoint/resolver/${entityID}`, {
        signal,
      });
    },

    /**
     * Used to get the default index pattern from the SIEM application.
     */
    indexPatterns(): string[] {
      return context.services.uiSettings.get(defaultIndexKey);
    },

    /**
     * Used to get the entity_id for an _id.
     */
    async entities({
      _id,
      indices,
      signal,
    }: {
      _id: string;
      indices: string[];
      signal: AbortSignal;
    }): Promise<ResolverEntityIndex> {
      return context.services.http.get('/api/endpoint/resolver/entity', {
        signal,
        query: {
          _id,
          indices,
        },
      });
    },
  };
  return dataAccessLayer;
}
