/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, orderBy } from 'lodash';
import { UIFilters } from '../../../../../typings/ui_filters';
import { Projection } from '../../../../projections/typings';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
import { getLocalFilterQuery } from './get_local_filter_query';
import { Setup } from '../../../helpers/setup_request';
import { localUIFilters } from './config';
import { LocalUIFilterName } from '../../../../../common/ui_filter';
import { withApmSpan } from '../../../../utils/with_apm_span';

export type LocalUIFiltersAPIResponse = PromiseReturnType<
  typeof getLocalUIFilters
>;

export function getLocalUIFilters({
  setup,
  projection,
  uiFilters,
  localFilterNames,
}: {
  setup: Setup;
  projection: Projection;
  uiFilters: UIFilters;
  localFilterNames: LocalUIFilterName[];
}) {
  return withApmSpan('get_ui_filter_options', () => {
    const { apmEventClient } = setup;

    const projectionWithoutAggs = cloneDeep(projection);

    delete projectionWithoutAggs.body.aggs;

    return Promise.all(
      localFilterNames.map(async (name) => {
        const query = getLocalFilterQuery({
          uiFilters,
          projection,
          localUIFilterName: name,
        });

        const response = await apmEventClient.search(
          'get_ui_filter_options_for_field',
          query
        );

        const filter = localUIFilters[name];

        const buckets = response?.aggregations?.by_terms?.buckets ?? [];

        return {
          ...filter,
          options: orderBy(
            buckets.map((bucket) => {
              return {
                name: bucket.key as string,
                count: bucket.bucket_count
                  ? bucket.bucket_count.value
                  : bucket.doc_count,
              };
            }),
            'count',
            'desc'
          ),
        };
      })
    );
  });
}
