/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IScopedClusterClient } from 'kibana/server';
import { CountResponse } from 'elasticsearch';
import {
  ResolverLegacyData,
  ResolverPhase1Data,
  ResolverData,
  BaseResult,
  ResolverResponse,
} from '../../../common/types';
import { EndpointAppContext, JSONish, Total } from '../../types';
import { ResolverNode, ResolverDataHit } from './common';
import { ResolverLegacyNode } from './legacy_node';
import { ResolverPhase1Node } from './phase1_node';
import { getPagination, PaginationInfo } from './query_builder';

export interface ParentAndResolverData {
  parentEntityID: string;
  events: ResolverData[];
}

export abstract class BaseSearchHandler {
  constructor(
    protected readonly client: IScopedClusterClient,
    protected readonly endpointContext: EndpointAppContext,
    protected readonly pageInfo: PaginationInfo,
    protected readonly countQuery: JSONish,
    protected readonly entityID: string
  ) {}

  protected static isLegacyData(
    data: ResolverLegacyData | ResolverPhase1Data
  ): data is ResolverLegacyData {
    return (data as ResolverLegacyData).endgame?.unique_pid !== undefined;
  }

  protected static nodeCreator(data: ResolverData): ResolverNode {
    if (BaseSearchHandler.isLegacyData(data)) {
      return new ResolverLegacyNode(data);
    }
    return new ResolverPhase1Node(data);
  }
  protected async buildPagination(total: Total): Promise<BaseResult> {
    const { page, pageSize, from } = await getPagination(this.endpointContext, this.pageInfo);
    let amount = total.value;
    if (total.relation === 'gte') {
      // perform count
      try {
        const response = (await this.client.callAsCurrentUser(
          'count',
          this.countQuery
        )) as CountResponse;
        amount = response.count;
      } catch (e) {
        throw new Error(`Failed to retrieve count: ${e}`);
      }
    }
    return {
      total: amount,
      request_page_index: page,
      request_page_size: pageSize,
      result_from_index: from,
    };
  }

  abstract buildResponse(hits: ResolverDataHit[], total: Total): Promise<ResolverResponse>;
}
