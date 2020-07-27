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
 * The only concrete DataAccessLayer. This isn't built in to Resolver. Instead we inject it. This way, tests can provide a fake one.
 */
export function dataAccessLayerFactory(
  context: KibanaReactContextValue<StartServices>
): DataAccessLayer {
  const dataAccessLayer: DataAccessLayer = {
    async relatedEvents(entityID: string): Promise<ResolverRelatedEvents> {
      return context.services.http.get(`/api/endpoint/resolver/${entityID}/events`, {
        query: { events: 100 },
      });
    },
    async resolverTree(entityID: string, signal: AbortSignal): Promise<ResolverTree> {
      return context.services.http.get(`/api/endpoint/resolver/${entityID}`, {
        signal,
      });
    },

    indexPatterns(): string[] {
      return context.services.uiSettings.get(defaultIndexKey);
    },

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
