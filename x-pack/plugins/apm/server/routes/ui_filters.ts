/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { omit } from 'lodash';
import { jsonRt } from '../../common/runtime_types/json_rt';
import { LocalUIFilterName } from '../../common/ui_filter';
import { getEsFilter } from '../lib/helpers/convert_ui_filters/get_es_filter';
import {
  Setup,
  setupRequest,
  SetupTimeRange,
} from '../lib/helpers/setup_request';
import { getLocalUIFilters } from '../lib/ui_filters/local_ui_filters';
import { localUIFilterNames } from '../lib/ui_filters/local_ui_filters/config';
import { getRumPageLoadTransactionsProjection } from '../projections/rum_page_load_transactions';
import { Projection } from '../projections/typings';
import { createRoute } from './create_route';
import { rangeRt, uiFiltersRt } from './default_api_types';
import { APMRequestHandlerContext } from './typings';

const filterNamesRt = t.type({
  filterNames: jsonRt.pipe(
    t.array(
      t.keyof(
        Object.fromEntries(
          localUIFilterNames.map((filterName) => [filterName, null])
        ) as Record<LocalUIFilterName, null>
      )
    )
  ),
});

const localUiBaseQueryRt = t.intersection([
  filterNamesRt,
  uiFiltersRt,
  rangeRt,
]);

function createLocalFiltersRoute<
  TEndpoint extends string,
  TProjection extends Projection,
  TQueryRT extends t.HasProps
>({
  endpoint,
  getProjection,
  queryRt,
}: {
  endpoint: TEndpoint;
  getProjection: GetProjection<
    TProjection,
    t.IntersectionC<[TQueryRT, BaseQueryType]>
  >;
  queryRt: TQueryRT;
}) {
  return createRoute({
    endpoint,
    params: t.type({
      query: t.intersection([localUiBaseQueryRt, queryRt]),
    }),
    options: { tags: ['access:apm'] },
    handler: async ({ context, request }) => {
      const setup = await setupRequest(context, request);
      const { uiFilters } = setup;
      const { query } = context.params;

      const { filterNames } = query;
      const projection = await getProjection({
        query,
        context,
        setup: {
          ...setup,
          esFilter: getEsFilter(omit(uiFilters, filterNames)),
        },
      });

      return getLocalUIFilters({
        projection,
        setup,
        uiFilters,
        localFilterNames: filterNames,
      });
    },
  });
}

export const rumOverviewLocalFiltersRoute = createLocalFiltersRoute({
  endpoint: 'GET /api/apm/ui_filters/local_filters/rumOverview',
  getProjection: async ({ setup }) => {
    return getRumPageLoadTransactionsProjection({
      setup,
    });
  },
  queryRt: t.type({}),
});

type BaseQueryType = typeof localUiBaseQueryRt;

type GetProjection<
  TProjection extends Projection,
  TQueryRT extends t.HasProps
> = ({
  query,
  setup,
  context,
}: {
  query: t.TypeOf<TQueryRT>;
  setup: Setup & SetupTimeRange;
  context: APMRequestHandlerContext;
}) => Promise<TProjection> | TProjection;
