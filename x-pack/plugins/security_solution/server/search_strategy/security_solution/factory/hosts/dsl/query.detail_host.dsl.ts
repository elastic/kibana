/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { HostOverviewRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import { cloudFieldsMap, hostFieldsMap } from '../../../../../lib/ecs_fields';
import { buildFieldsTermAggregation } from '../../../../../lib/hosts/helpers';
import { reduceFields } from '../../../../../utils/build_query/reduce_fields';

export const buildHostOverviewQuery = ({
  fields,
  hostName,
  defaultIndex,
  timerange: { from, to },
}: HostOverviewRequestOptions): ISearchRequestParams => {
  const esFields = reduceFields(fields, { ...hostFieldsMap, ...cloudFieldsMap });

  const filter = [
    { term: { 'host.name': hostName } },
    {
      range: {
        '@timestamp': {
          format: 'strict_date_optional_time',
          gte: from,
          lte: to,
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...buildFieldsTermAggregation(esFields.filter((field) => !['@timestamp'].includes(field))),
      },
      query: { bool: { filter } },
      size: 0,
      track_total_hits: false,
    },
  };

  return dslQuery;
};
