/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  IScopedClusterClient,
  KibanaResponseFactory,
  Logger,
  IKibanaResponse,
  ResponseError,
} from 'kibana/server';
import { CountResponse } from 'elasticsearch';
import {
  ResolverLegacyData,
  ResolverElasticEndpointData,
  ResolverData,
  BaseResult,
  ResolverResponse,
  EndpointAppConstants,
} from '../../../common/types';
import { EndpointAppContext, JSONish, Total } from '../../types';
import {
  ResolverNode,
  ResolverDataHit,
  PaginationInfo,
  isLegacyEntityID,
  EntityParseError,
} from './common';
import { ResolverLegacyNode } from './legacy_node';
import { ResolverElasticEndpointNode } from './es_endpoint_node';

export interface ParentAndResolverData {
  parentEntityID: string;
  events: ResolverData[];
}

export abstract class BaseSearchHandler {
  protected readonly log: Logger;
  constructor(protected readonly endpointContext: EndpointAppContext) {
    this.log = this.endpointContext.logFactory.get('resolver');
  }

  protected getIndex(entityID: string): string {
    return isLegacyEntityID(entityID)
      ? EndpointAppConstants.LEGACY_EVENT_INDEX_NAME
      : EndpointAppConstants.EVENT_INDEX_NAME;
  }

  protected static isLegacyData(
    data: ResolverLegacyData | ResolverElasticEndpointData
  ): data is ResolverLegacyData {
    return (data as ResolverLegacyData).endgame?.unique_pid !== undefined;
  }

  protected static nodeCreator(data: ResolverData): ResolverNode {
    if (BaseSearchHandler.isLegacyData(data)) {
      return new ResolverLegacyNode(data);
    }
    return new ResolverElasticEndpointNode(data);
  }

  protected async getPagination(
    endpointAppContext: EndpointAppContext,
    paginationInfo: PaginationInfo
  ) {
    const config = await endpointAppContext.config();
    const page = paginationInfo.page || config.resolverResultListDefaultFirstPageIndex;
    const pageSize = paginationInfo.pageSize || config.resolverResultListDefaultPageSize;
    return {
      page,
      pageSize,
      from: page * pageSize,
    };
  }

  protected buildSearchBody(queryClause: JSONish, size: number, index: string) {
    // Need to address https://github.com/elastic/endpoint-app-team/issues/147 here

    return {
      body: {
        query: queryClause,
        sort: [{ '@timestamp': { order: 'asc' } }],
      },
      size,
      index,
    };
  }

  protected handleError(res: KibanaResponseFactory, err: any): IKibanaResponse<ResponseError> {
    this.log.warn(err);
    if (EntityParseError.isEntityParseError(err)) {
      return res.badRequest({ body: err });
    }
    return res.internalError({ body: err });
  }

  abstract async buildResponse(hits: ResolverDataHit[], total: Total): Promise<ResolverResponse>;
}
