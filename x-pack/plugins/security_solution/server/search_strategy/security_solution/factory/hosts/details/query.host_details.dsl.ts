/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchRequestParams } from '../../../../../../../../../src/plugins/data/common';
import { cloudFieldsMap, hostFieldsMap } from '../../../../../../common/ecs/ecs_fields';
import { HostDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution';
import { buildFieldsTermAggregation } from '../../../../../lib/hosts/helpers';
import { reduceFields } from '../../../../../utils/build_query/reduce_fields';
import { HOST_FIELDS } from './helpers';

export const buildHostDetailsQuery = ({
  hostName,
  defaultIndex,
  timerange: { from, to },
}: HostDetailsRequestOptions): ISearchRequestParams => {
  const esFields = reduceFields(HOST_FIELDS, { ...hostFieldsMap, ...cloudFieldsMap });

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
