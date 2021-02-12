/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EqlSearchStrategyResponse } from '../../../../../data_enhanced/common';
import { DEFAULT_MAX_TABLE_QUERY_SIZE } from '../../../../common/constants';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';
import { EventHit, TimelineEdges } from '../../../../common/search_strategy';
import {
  TimelineEqlRequestOptions,
  TimelineEqlResponse,
} from '../../../../common/search_strategy/timeline/events/eql';
import { inspectStringifyObject } from '../../../utils/build_query';
import { TIMELINE_EVENTS_FIELDS } from '../factory/events/all/constants';
import { formatTimelineData } from '../factory/events/all/helpers';

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
      ...(options.tiebreakerField != null
        ? {
            tiebreaker_field: options.tiebreakerField,
          }
        : {}),
      size: options.size ?? 100,
      timestamp_field: options.timestampField ?? '@timestamp',
    },
  };
};

export const parseEqlResponse = (
  options: TimelineEqlRequestOptions,
  response: EqlSearchStrategyResponse<EqlSearchResponse<unknown>>
): Promise<TimelineEqlResponse> => {
  const { activePage, querySize } = options.pagination;
  // const totalCount = response.rawResponse?.body?.hits?.total?.value ?? 0;
  let edges: TimelineEdges[] = [];
  if (response.rawResponse.body.hits.sequences !== undefined) {
    edges = response.rawResponse.body.hits.sequences.reduce<TimelineEdges[]>(
      (data, sequence, sequenceIndex) => {
        const sequenceParentId = sequence.events[0]?._id ?? null;
        return [
          ...data,
          ...sequence.events.map((event, eventIndex) => {
            const item = formatTimelineData(
              options.fieldRequested,
              TIMELINE_EVENTS_FIELDS,
              event as EventHit
            );
            return {
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
            };
          }),
        ];
      },
      []
    );
  } else if (response.rawResponse.body.hits.events !== undefined) {
    edges = response.rawResponse.body.hits.events.map((event) =>
      formatTimelineData(options.fieldRequested, TIMELINE_EVENTS_FIELDS, event as EventHit)
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
