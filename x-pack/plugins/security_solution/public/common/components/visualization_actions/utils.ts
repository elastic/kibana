/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter } from '@kbn/es-query';

import { SecurityPageName } from '../../../../common/constants';
import { HISTOGRAM_LEGEND_ACTION_FILTER_IN } from '../../../actions/filter/lens/filter_in';
import { TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_IN } from '../../../actions/filter/lens/filter_in_timeline';
import { HISTOGRAM_LEGEND_ACTION_FILTER_OUT } from '../../../actions/filter/lens/filter_out';
import { TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_OUT } from '../../../actions/filter/lens/filter_out_timeline';
import type { Request } from './types';

export const VISUALIZATION_ACTIONS_BUTTON_CLASS = 'histogram-actions-trigger';
export const FILTER_IN_LEGEND_ACTION = `filterIn`;
export const FILTER_OUT_LEGEND_ACTION = `filterOut`;

const pageFilterFieldMap: Record<string, string> = {
  [SecurityPageName.hosts]: 'host',
  [SecurityPageName.users]: 'user',
};

export const getDetailsPageFilter = (pageName: string, detailName?: string): Filter[] => {
  const field = pageFilterFieldMap[pageName];
  return field && detailName
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: `${field}.name`,
            params: {
              query: detailName,
            },
          },
          query: {
            match_phrase: {
              [`${field}.name`]: detailName,
            },
          },
        },
      ]
    : [];
};

export const fieldNameExistsFilter = (pageName: string): Filter[] => {
  const field = pageFilterFieldMap[pageName];

  return field && pageName
    ? [
        {
          query: {
            bool: {
              should: [
                {
                  exists: {
                    field: `${field}.name`,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
          meta: {
            alias: '',
            disabled: false,
            key: 'bool',
            negate: false,
            type: 'custom',
            value: `{"query": {"bool": {"filter": [{"bool": {"should": [{"exists": {"field": "${field}.name"}}],"minimum_should_match": 1}}]}}}`,
          },
        },
      ]
    : [];
};

export const getNetworkDetailsPageFilter = (ipAddress?: string): Filter[] =>
  ipAddress
    ? [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
            type: 'phrase',
            key: 'source.ip',
            params: {
              query: ipAddress,
            },
          },
          query: {
            bool: {
              should: [
                {
                  match_phrase: {
                    'source.ip': ipAddress,
                  },
                },
                {
                  match_phrase: {
                    'destination.ip': ipAddress,
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      ]
    : [];

export const sourceOrDestinationIpExistsFilter: Filter[] = [
  {
    query: {
      bool: {
        should: [
          {
            exists: {
              field: 'source.ip',
            },
          },
          {
            exists: {
              field: 'destination.ip',
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    meta: {
      alias: '',
      disabled: false,
      key: 'bool',
      negate: false,
      type: 'custom',
      value:
        '{"bool":{"filter":[{"bool":{"should":[{"bool":{"should":[{"exists":{"field": "source.ip"}}],"minimum_should_match":1}},{"bool":{"should":[{"exists":{"field": "destination.ip"}}],"minimum_should_match":1}}],"minimum_should_match":1}}]}}',
    },
  },
];

export const getIndexFilters = (selectedPatterns: string[]) =>
  selectedPatterns.length >= 1
    ? [
        {
          meta: {
            type: 'phrases',
            key: '_index',
            params: selectedPatterns,
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              should: selectedPatterns.map((selectedPattern) => ({
                match_phrase: { _index: selectedPattern },
              })),
              minimum_should_match: 1,
            },
          },
        },
      ]
    : [];

export const getRequestsAndResponses = (requests: Request[] | null | undefined) => {
  return (requests ?? []).reduce(
    (acc: { requests: string[]; responses: string[] }, req: Request) => {
      return {
        requests: [
          ...acc.requests,
          JSON.stringify(
            { body: req?.json, index: (req?.stats?.indexFilter?.value ?? '').split(',') },
            null,
            2
          ),
        ],
        responses: [
          ...acc.responses,
          JSON.stringify(req?.response?.json?.rawResponse ?? {}, null, 2),
        ],
      };
    },
    { requests: [], responses: [] }
  );
};

export const parseVisualizationData = <T>(data: string[]): T[] =>
  data.reduce((acc, curr) => {
    try {
      return [...acc, JSON.parse(curr)];
    } catch (e) {
      return acc;
    }
  }, [] as T[]);

export const showLegendActionsByActionId = ({
  actionId,
  scopeId,
}: {
  actionId: string;
  scopeId: string;
}) => {
  switch (actionId) {
    /** We no longer use Lens' default filter in / out actions
     * as extra custom actions needed after filters applied.
     * For example: hide the topN panel after filters applied */
    case FILTER_IN_LEGEND_ACTION:
    case FILTER_OUT_LEGEND_ACTION:
      return false;
    case HISTOGRAM_LEGEND_ACTION_FILTER_IN:
    case HISTOGRAM_LEGEND_ACTION_FILTER_OUT:
      return scopeId !== 'timeline';
    case TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_IN:
    case TIMELINE_HISTOGRAM_LEGEND_ACTION_FILTER_OUT:
      return scopeId === 'timeline';
    default:
      return true;
  }
};
