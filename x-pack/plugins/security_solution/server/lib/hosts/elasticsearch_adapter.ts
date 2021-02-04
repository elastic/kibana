/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@elastic/safer-lodash-set/fp';
import { get, getOr, has, head } from 'lodash/fp';

import {
  EndpointFields,
  FirstLastSeenHost,
  HostItem,
  HostsData,
  HostsEdges,
} from '../../graphql/types';
import { inspectStringifyObject } from '../../utils/build_query';
import { hostFieldsMap } from '../ecs_fields';
import { FrameworkAdapter, FrameworkRequest } from '../framework';
import { TermAggregation } from '../types';
import { buildHostOverviewQuery } from './query.detail_host.dsl';
import { buildHostsQuery } from './query.hosts.dsl';
import { buildLastFirstSeenHostQuery } from './query.last_first_seen_host.dsl';
import {
  HostAggEsData,
  HostAggEsItem,
  HostBuckets,
  HostEsData,
  HostLastFirstSeenRequestOptions,
  HostOverviewRequestOptions,
  HostsAdapter,
  HostsRequestOptions,
  HostValue,
} from './types';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../common/constants';
import { EndpointAppContext } from '../../endpoint/types';
import { getHostData } from '../../endpoint/routes/metadata/handlers';

export class ElasticsearchHostsAdapter implements HostsAdapter {
  constructor(
    private readonly framework: FrameworkAdapter,
    private readonly endpointContext: EndpointAppContext
  ) {}

  public async getHosts(
    request: FrameworkRequest,
    options: HostsRequestOptions
  ): Promise<HostsData> {
    const dsl = buildHostsQuery(options);
    if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
      throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
    }
    const response = await this.framework.callWithRequest<HostEsData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const { activePage, cursorStart, fakePossibleCount, querySize } = options.pagination;
    const totalCount = getOr(0, 'aggregations.host_count.value', response);
    const buckets: HostAggEsItem[] = getOr([], 'aggregations.host_data.buckets', response);
    const hostsEdges = buckets.map((bucket) => formatHostEdgesData(options.fields, bucket));
    const fakeTotalCount = fakePossibleCount <= totalCount ? fakePossibleCount : totalCount;
    const edges = hostsEdges.splice(cursorStart, querySize - cursorStart);
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const showMorePagesIndicator = totalCount > fakeTotalCount;

    return {
      inspect,
      edges,
      totalCount,
      pageInfo: {
        activePage: activePage ? activePage : 0,
        fakeTotalCount,
        showMorePagesIndicator,
      },
    };
  }

  public async getHostOverview(
    request: FrameworkRequest,
    options: HostOverviewRequestOptions
  ): Promise<HostItem> {
    const dsl = buildHostOverviewQuery(options);
    const response = await this.framework.callWithRequest<HostAggEsData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const aggregations: HostAggEsItem = get('aggregations', response) || {};
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };
    const formattedHostItem = formatHostItem(options.fields, aggregations);
    const ident = // endpoint-generated ID, NOT elastic-agent-id
      formattedHostItem.agent && formattedHostItem.agent.id
        ? Array.isArray(formattedHostItem.agent.id)
          ? formattedHostItem.agent.id[0]
          : formattedHostItem.agent.id
        : null;
    const endpoint: EndpointFields | null = await this.getHostEndpoint(request, ident);
    return { inspect, _id: options.hostName, ...formattedHostItem, endpoint };
  }

  public async getHostEndpoint(
    request: FrameworkRequest,
    id: string | null
  ): Promise<EndpointFields | null> {
    const logger = this.endpointContext.logFactory.get('metadata');
    try {
      const agentService = this.endpointContext.service.getAgentService();
      if (agentService === undefined) {
        throw new Error('agentService not available');
      }
      const metadataRequestContext = {
        endpointAppContextService: this.endpointContext.service,
        logger,
        requestHandlerContext: request.context,
      };
      const endpointData =
        id != null && metadataRequestContext.endpointAppContextService.getAgentService() != null
          ? await getHostData(metadataRequestContext, id)
          : null;
      return endpointData != null && endpointData.metadata
        ? {
            endpointPolicy: endpointData.metadata.Endpoint.policy.applied.name,
            policyStatus: endpointData.metadata.Endpoint.policy.applied.status,
            sensorVersion: endpointData.metadata.agent.version,
          }
        : null;
    } catch (err) {
      logger.warn(JSON.stringify(err, null, 2));
      return null;
    }
  }

  public async getHostFirstLastSeen(
    request: FrameworkRequest,
    options: HostLastFirstSeenRequestOptions
  ): Promise<FirstLastSeenHost> {
    const dsl = buildLastFirstSeenHostQuery(options);
    const response = await this.framework.callWithRequest<HostAggEsData, TermAggregation>(
      request,
      'search',
      dsl
    );
    const aggregations: HostAggEsItem = get('aggregations', response) || {};
    const inspect = {
      dsl: [inspectStringifyObject(dsl)],
      response: [inspectStringifyObject(response)],
    };

    return {
      inspect,
      firstSeen: get('firstSeen.value_as_string', aggregations),
      lastSeen: get('lastSeen.value_as_string', aggregations),
    };
  }
}

export const formatHostEdgesData = (fields: readonly string[], bucket: HostAggEsItem): HostsEdges =>
  fields.reduce<HostsEdges>(
    (flattenedFields, fieldName) => {
      const hostId = get('key', bucket);
      flattenedFields.node._id = hostId || null;
      flattenedFields.cursor.value = hostId || '';
      const fieldValue = getHostFieldValue(fieldName, bucket);
      if (fieldValue != null) {
        return set(`node.${fieldName}`, fieldValue, flattenedFields);
      }
      return flattenedFields;
    },
    {
      node: {},
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

const formatHostItem = (fields: readonly string[], bucket: HostAggEsItem): HostItem =>
  fields.reduce<HostItem>((flattenedFields, fieldName) => {
    const fieldValue = getHostFieldValue(fieldName, bucket);
    if (fieldValue != null) {
      return set(fieldName, fieldValue, flattenedFields);
    }
    return flattenedFields;
  }, {});

const getHostFieldValue = (fieldName: string, bucket: HostAggEsItem): string | string[] | null => {
  const aggField = hostFieldsMap[fieldName]
    ? hostFieldsMap[fieldName].replace(/\./g, '_')
    : fieldName.replace(/\./g, '_');
  if (
    [
      'host.ip',
      'host.mac',
      'cloud.instance.id',
      'cloud.machine.type',
      'cloud.provider',
      'cloud.region',
    ].includes(fieldName) &&
    has(aggField, bucket)
  ) {
    const data: HostBuckets = get(aggField, bucket);
    return data.buckets.map((obj) => obj.key);
  } else if (has(`${aggField}.buckets`, bucket)) {
    return getFirstItem(get(`${aggField}`, bucket));
  } else if (has(aggField, bucket)) {
    const valueObj: HostValue = get(aggField, bucket);
    return valueObj.value_as_string;
  } else if (['host.name', 'host.os.name', 'host.os.version'].includes(fieldName)) {
    switch (fieldName) {
      case 'host.name':
        return get('key', bucket) || null;
      case 'host.os.name':
        return get('os.hits.hits[0]._source.host.os.name', bucket) || null;
      case 'host.os.version':
        return get('os.hits.hits[0]._source.host.os.version', bucket) || null;
    }
  }
  return null;
};

const getFirstItem = (data: HostBuckets): string | null => {
  const firstItem = head(data.buckets);
  if (firstItem == null) {
    return null;
  }
  return firstItem.key;
};
