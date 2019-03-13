/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, getOr, isArray, isEmpty, isNil, isNumber, isString, last, merge } from 'lodash/fp';
import { isObject } from 'util';

import { DetailItem, EcsEdges, EventDetailsData, EventsData, KpiItem } from '../../graphql/types';
import {
  getDocumentation,
  getIndexAlias,
  hasDocumentation,
  IndexAlias,
} from '../../utils/beat_schema';
import { baseCategoryFields } from '../../utils/beat_schema/8.0.0';
import { mergeFieldsWithHit } from '../../utils/build_query';
import { eventFieldsMap } from '../ecs_fields';
import {
  FrameworkAdapter,
  FrameworkRequest,
  MappingProperties,
  RequestOptions,
} from '../framework';
import { TermAggregation } from '../types';

import { buildDetailsQuery, buildQuery } from './query.dsl';
import { EventHit, EventsAdapter, RequestDetailsOptions } from './types';

export class ElasticsearchEventsAdapter implements EventsAdapter {
  constructor(private readonly framework: FrameworkAdapter) {}

  public async getEvents(request: FrameworkRequest, options: RequestOptions): Promise<EventsData> {
    const response = await this.framework.callWithRequest<EventHit, TermAggregation>(
      request,
      'search',
      buildQuery(options)
    );

    const kpiEventType: KpiItem[] =
      response.aggregations && response.aggregations.count_event_type
        ? response.aggregations.count_event_type.buckets.map(item => ({
            value: item.key,
            count: item.doc_count,
          }))
        : [];
    const { limit } = options.pagination;
    const totalCount = getOr(0, 'hits.total.value', response);
    const hits = response.hits.hits;
    const eventsEdges: EcsEdges[] = hits.map(hit =>
      formatEventsData(options.fields, hit, eventFieldsMap)
    );
    const hasNextPage = eventsEdges.length === limit + 1;
    const edges = hasNextPage ? eventsEdges.splice(0, limit) : eventsEdges;
    const lastCursor = get('cursor', last(edges));
    return {
      kpiEventType,
      edges,
      totalCount,
      pageInfo: {
        hasNextPage,
        endCursor: lastCursor,
      },
    };
  }

  public async getEventDetails(
    request: FrameworkRequest,
    options: RequestDetailsOptions
  ): Promise<EventDetailsData> {
    const [mapResponse, searchResponse] = await Promise.all([
      this.framework.callWithRequest(request, 'indices.getMapping', {
        allowNoIndices: true,
        ignoreUnavailable: true,
        index: options.indexName,
      }),
      this.framework.callWithRequest<EventHit, TermAggregation>(
        request,
        'search',
        buildDetailsQuery(options.indexName, options.eventId)
      ),
    ]);

    const sourceData = getOr({}, 'hits.hits.0._source', searchResponse);
    const hitsData = getOr({}, 'hits.hits.0', searchResponse);
    delete hitsData._source;

    return {
      data: getSchemaFromData(
        {
          ...addBasicElasticSearchProperties(),
          ...getOr({}, [options.indexName, 'mappings', 'properties'], mapResponse),
        },
        getDataFromHits(merge(sourceData, hitsData)),
        getIndexAlias(options.indexName)
      ),
    };
  }
}

export const formatEventsData = (
  fields: ReadonlyArray<string>,
  hit: EventHit,
  fieldMap: Readonly<Record<string, string>>
) =>
  fields.reduce<EcsEdges>(
    (flattenedFields, fieldName) => {
      flattenedFields.node._id = hit._id;
      flattenedFields.node._index = hit._index;
      if (hit.sort && hit.sort.length > 1) {
        flattenedFields.cursor.value = hit.sort[0];
        flattenedFields.cursor.tiebreaker = hit.sort[1];
      }
      return mergeFieldsWithHit(fieldName, flattenedFields, fieldMap, hit);
    },
    {
      node: { _id: '' },
      cursor: {
        value: '',
        tiebreaker: null,
      },
    }
  );

const getDataFromHits = (sources: EventSource, category?: string, path?: string): DetailItem[] =>
  Object.keys(sources).reduce<DetailItem[]>((accumulator, source) => {
    const item = get(source, sources);
    if (isArray(item) || isString(item) || isNumber(item)) {
      const field = path ? `${path}.${source}` : source;
      category = field.split('.')[0];
      if (isEmpty(category) && baseCategoryFields.includes(category)) {
        category = 'base';
      }
      return [
        ...accumulator,
        {
          category,
          field,
          value: item,
        } as DetailItem,
      ];
    } else if (isObject(item)) {
      return [
        ...accumulator,
        ...getDataFromHits(item, category || source, path ? `${path}.${source}` : source),
      ];
    }
    return accumulator;
  }, []);

const getSchemaFromData = (
  properties: MappingProperties,
  data: DetailItem[],
  index: IndexAlias,
  path?: string
): DetailItem[] =>
  !isEmpty(properties)
    ? Object.keys(properties).reduce<DetailItem[]>((accumulator, property) => {
        const item = get(property, properties);
        const field = path ? `${path}.${property}` : property;
        const dataFilterItem = data.filter(dataItem => dataItem.field === field);
        if (isNil(item.properties) && dataFilterItem.length === 1) {
          const dataItem = dataFilterItem[0];
          const dataFromMapping = {
            type: get([property, 'type'], properties),
          };
          return [
            ...accumulator,
            {
              ...dataItem,
              ...(hasDocumentation(index, field)
                ? merge(getDocumentation(index, field), dataFromMapping)
                : dataFromMapping),
            },
          ];
        } else if (!isNil(item.properties)) {
          return [...accumulator, ...getSchemaFromData(item.properties, data, index, field)];
        }
        return accumulator;
      }, [])
    : data;

const addBasicElasticSearchProperties = () => ({
  _id: {
    type: 'keyword',
  },
  _index: {
    type: 'keyword',
  },
  _type: {
    type: 'keyword',
  },
  _score: {
    type: 'long',
  },
});
