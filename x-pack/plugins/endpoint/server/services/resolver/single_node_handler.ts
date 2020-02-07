/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ResolverData, ResolverNodeDetailsResponse } from '../../../common/types';
import { Total } from '../../types';
import { ResolverDataHit } from './common';
import { BaseSearchHandler } from './search_handler';

export class SingleNodeHandler extends BaseSearchHandler {
  public async buildResponse(
    hits: ResolverDataHit[],
    total: Total
  ): Promise<ResolverNodeDetailsResponse> {
    const events: ResolverData[] = [];
    let parentEntityID: string | undefined;
    // there could be multiple events for a single event id because process creation, termination etc will all have the
    // same entity id
    for (const hit of hits) {
      const node = BaseSearchHandler.nodeCreator(hit._source);
      events.push(node.esData);
      parentEntityID = node.parentEntityID;
    }

    const pagination = await this.buildPagination(
      // total is an object in kibana >=7.0
      // see https://github.com/elastic/kibana/issues/56694
      total
    );
    return {
      node: {
        parent_entity_id: parentEntityID,
        entity_id: this.entityID,
        events,
      },
      ...pagination,
    };
  }
}
