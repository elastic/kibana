/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { EqlSearchStrategyResponse } from '../../../../../../../src/plugins/data/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import {
  EqlSearchResponse,
  EqlSequence,
  EventHit,
  TimelineEdges,
} from '../../../../common/search_strategy';
import {
  TimelineEqlRequestOptions,
  TimelineEqlResponse,
} from '../../../../common/search_strategy/timeline/events/eql';
import { inspectStringifyObject } from '../../../utils/build_query';
import { TIMELINE_EVENTS_FIELDS } from '../factory/helpers/constants';
import { formatTimelineData } from '../factory/helpers/format_timeline_data';

export const buildEqlDsl = (options: TimelineEqlRequestOptions): Record<string, unknown> => {
  if (options.pagination && options.pagination.querySize >= DEFAULT_MAX_TABLE_QUERY_SIZE) {
    throw new Error(`No query size above ${DEFAULT_MAX_TABLE_QUERY_SIZE}`);
  }

  const requestFilter: unknown[] = [
    {
      range: {
        [options.timestampField ?? '@timestamp']: {
          gte: options.timerange.from,
          lte: options.timerange.to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  return {
    allow_no_indices: true,
    index: options.defaultIndex,
    ignore_unavailable: true,
    body: {
      event_category_field: options.eventCategoryField ?? 'event.category',
      filter: {
        bool: {
          filter: requestFilter,
        },
      },
      query: options.filterQuery,
      ...(!isEmpty(options.tiebreakerField)
        ? {
            tiebreaker_field: options.tiebreakerField,
          }
        : {}),
      size: options.size ?? 100,
      timestamp_field: options.timestampField ?? '@timestamp',
    },
  };
};
const parseSequences = async (sequences: Array<EqlSequence<unknown>>, fieldRequested: string[]) =>
  sequences.reduce<Promise<TimelineEdges[]>>(async (acc, sequence, sequenceIndex) => {
    const sequenceParentId = sequence.events[0]?._id ?? null;
    const data = await acc;
    const allData = await Promise.all(
      sequence.events.map(async (event, eventIndex) => {
        const item = await formatTimelineData(
          fieldRequested,
          TIMELINE_EVENTS_FIELDS,
          event as EventHit
        );
        return Promise.resolve({
          ...item,
          node: {
            ...item.node,
            ecs: {
              ...item.node.ecs,
              ...(sequenceParentId != null
                ? {
                    eql: {
                      parentId: sequenceParentId,
                      sequenceNumber: `${sequenceIndex}-${eventIndex}`,
                    },
                  }
                : {}),
            },
          },
        });
      })
    );
    return Promise.resolve([...data, ...allData]);
  }, Promise.resolve([]));

export const parseEqlResponse = async (
  options: TimelineEqlRequestOptions,
  response: EqlSearchStrategyResponse<EqlSearchResponse<unknown>>
): Promise<TimelineEqlResponse> => {
  const { activePage, querySize } = options.pagination;
  let edges: TimelineEdges[] = [];

  if (response.rawResponse.body.hits.sequences !== undefined) {
    edges = await parseSequences(response.rawResponse.body.hits.sequences, options.fieldRequested);
  } else if (response.rawResponse.body.hits.events !== undefined) {
    edges = await Promise.all(
      response.rawResponse.body.hits.events.map(async (event) =>
        formatTimelineData(options.fieldRequested, TIMELINE_EVENTS_FIELDS, event as EventHit)
      )
    );
  }

  const inspect = {
    dsl: [inspectStringifyObject(buildEqlDsl(options))],
  };

  const startPage = activePage === 0 ? activePage : activePage * querySize;
  const endPage = startPage + querySize;

  return Promise.resolve({
    ...response,
    inspect,
    edges: edges.slice(startPage, endPage),
    totalCount: edges.length,
    pageInfo: {
      activePage: activePage ?? 0,
      querySize,
    },
  });
};
