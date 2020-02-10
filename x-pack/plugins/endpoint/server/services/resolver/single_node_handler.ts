/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RequestHandler, IScopedClusterClient } from 'kibana/server';
import { SearchResponse } from 'elasticsearch';

import { ResolverEvent, ResolverNodeDetailsResponse } from '../../../common/types';
import { Total, EndpointAppContext, JSONish } from '../../types';
import { ResolverDataHit, PaginationInfo, isLegacyEntityID, parseLegacyEntityID } from './common';
import { BaseSearchHandler } from './search_handler';

interface ResolverQueryParams {
  after?: string;
  limit: number;
}

interface ResolverParams {
  id: string;
}

export class SingleNodeHandler extends BaseSearchHandler {
  private buildLegacyRelatedEventsQuery(endpointID: string, uniquePID: string) {
    return {
      bool: {
        filter: [
          {
            term: { 'endgame.unique_pid': uniquePID },
          },
          {
            match: { 'agent.id': endpointID },
          },
          {
            bool: {
              must_not: {
                term: { 'event.category': 'process' },
              },
            },
          },
        ],
      },
    };
  }

  private buildESEndpointRelatedEventsQuery(entityID: string) {
    return {
      bool: {
        filter: [
          {
            match: { 'endpoint.process.entity_id': entityID },
          },
          {
            bool: {
              must_not: {
                term: { 'event.category': 'process' },
              },
            },
          },
        ],
      },
    };
  }

  private buildLegacyLifecycleQuery(endpointID: string, uniquePID: string) {
    return {
      bool: {
        filter: [
          {
            term: { 'endgame.unique_pid': uniquePID },
          },
          {
            match: { 'agent.id': endpointID },
          },
          {
            term: { 'event.category': 'process' },
          },
        ],
      },
    };
  }

  private buildESEndpointLifecycleQuery(entityID: string) {
    return {
      bool: {
        filter: [
          {
            match: { 'endpoint.process.entity_id': entityID },
          },
          {
            term: { 'event.category': 'process' },
          },
        ],
      },
    };
  }

  private getRelatedEventsQueryParam(entityID: string): JSONish {
    if (isLegacyEntityID(entityID)) {
      const { endpointID, uniquePID } = parseLegacyEntityID(entityID);
      return this.buildLegacyRelatedEventsQuery(endpointID, uniquePID);
    }

    return this.buildESEndpointRelatedEventsQuery(entityID);
  }

  private getLifecycleQueryField(entityID: string): JSONish {
    if (isLegacyEntityID(entityID)) {
      const { endpointID, uniquePID } = parseLegacyEntityID(entityID);
      return this.buildLegacyLifecycleQuery(endpointID, uniquePID);
    }

    return this.buildESEndpointLifecycleQuery(entityID);
  }

  private buildRelatedEventsSearch(entityID: string, size: number) {
    return this.buildSearchBody(
      this.getRelatedEventsQueryParam(entityID),
      size,
      this.getIndex(entityID)
    );
  }

  private buildLifecycleSearch(entityID: string, size: number) {
    return this.buildSearchBody(
      this.getLifecycleQueryField(entityID),
      size,
      this.getIndex(entityID)
    );
  }

  private async findEvents(client: IScopedClusterClient, entityID: string, limit: number) {
    const query = this.buildRelatedEventsSearch(entityID, limit);

    this.log.debug(`events search: ${JSON.stringify(query)}`);

    const response = (await client.callAsCurrentUser('search', query)) as SearchResponse<
      ResolverEvent
    >;

    const events: ResolverEvent[] = [];
    for (const hit of response.hits.hits) {
      events.push(hit._source);
    }

    return {
      total: response.aggregations?.total?.value || 0,
      events,
    };
  }

  private async findLifecycle(client: IScopedClusterClient, entityID: string, limit: number) {
    const query = this.buildLifecycleSearch(entityID, limit);
    this.log.debug(`lifecycle search: ${JSON.stringify(query)}`);

    const response = (await client.callAsCurrentUser('search', query)) as SearchResponse<
      ResolverEvent
    >;

    const lifecycle: ResolverEvent[] = [];
    for (const hit of response.hits.hits) {
      lifecycle.push(hit._source);
    }

    return {
      lifecycle,
    };
  }

  handleRequest(): RequestHandler<ResolverParams, ResolverQueryParams> {
    return async (context, req, res) => {
      const entityID = req.params.id;
      this.log.debug(`entity_id: ${entityID}`);
      try {
        // TODO pass in search after info
        const eventInfo = await this.findEvents(
          context.core.elasticsearch.dataClient,
          entityID,
          req.query.limit
        );

        const lifecycle = await this.findLifecycle(
          context.core.elasticsearch.dataClient,
          entityID,
          req.query.limit
        );
        return res.ok({
          body: {
            lifecycle,
            events: eventInfo.events,
            pagination: {
              total: eventInfo.total,
            },
          },
        });
      } catch (err) {
        return this.handleError(res, err);
      }
    };
  }
}
