/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';
import { mergeProjection } from '../../../projections/util/merge_projection';
import { Projection } from '../../../projections/typings';
import { UIFilters } from '../../../../typings/ui_filters';
import { getEsFilter } from '../../helpers/convert_ui_filters/get_es_filter';
import { localUIFilters } from './config';
import { LocalUIFilterName } from '../../../../common/ui_filter';

export const getLocalFilterQuery = ({
  uiFilters,
  projection,
  localUIFilterName,
}: {
  uiFilters: UIFilters;
  projection: Projection;
  localUIFilterName: LocalUIFilterName;
}) => {
  const field = localUIFilters[localUIFilterName];
  const filter = getEsFilter(omit(uiFilters, field.name));

  const bucketCountAggregation = projection.body.aggs
    ? {
        aggs: {
          bucket_count: {
            cardinality: {
              field:
                projection.body.aggs[Object.keys(projection.body.aggs)[0]].terms
                  .field,
            },
          },
        },
      }
    : null;

  return mergeProjection(projection, {
    body: {
      size: 0,
      query: {
        bool: {
          filter: filter.concat(projection.body.query?.bool?.filter || []),
        },
      },
      aggs: {
        by_terms: {
          terms: {
            field: field.fieldName,
            order: {
              _count: 'desc',
            },
          },
          ...bucketCountAggregation,
        },
      },
    },
  });
};
