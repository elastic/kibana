/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { get } from 'lodash';
import { Storage } from '../../../../../src/plugins/kibana_utils/public';
import { getEsDSLDatasource } from './esdsl';
import { ExpressionsSetup } from '../../../../../src/plugins/expressions/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../../src/plugins/data/public';
import { Datasource, EditorFrameSetup } from '../types';
import { flatten } from './flatten';
import { buildQueryFromFilters } from '../../../../../src/plugins/data/common/es_query/es_query';

export interface IndexPatternDatasourceSetupPlugins {
  expressions: ExpressionsSetup;
  data: DataPublicPluginSetup;
  editorFrame: EditorFrameSetup;
}

export interface IndexPatternDatasourceStartPlugins {
  data: DataPublicPluginStart;
}

export class EsDSLDatasource {
  constructor() {}

  setup(
    core: CoreSetup<IndexPatternDatasourceStartPlugins>,
    { expressions, editorFrame }: IndexPatternDatasourceSetupPlugins
  ) {
    expressions.registerFunction({
      name: 'esdsl',
      type: 'kibana_datatable',
      inputTypes: ['kibana_context', 'null'],
      help: '',
      args: {
        index: {
          types: ['string'],
          help: '',
        },
        query: {
          types: ['string'],
          help: '',
        },
        timeField: {
          types: ['string'],
          help: '',
        },
        overwrittenFieldTypes: {
          types: ['string'],
          help: '',
        },
      },
      async fn(input, args, { inspectorAdapters, abortSignal }) {
        const [, { data }] = await core.getStartServices();
        const timeRange: any = get(input, 'timeRange', undefined);
        const timeField = get(args, 'timeField', '@timestamp');
        const timeBounds = timeRange && data.query.timefilter.timefilter.calculateBounds(timeRange);
        const timeFilter = timeBounds
          ? {
              meta: {
                index: args.index,
                range: {
                  [timeField]: {
                    format: 'strict_date_optional_time',
                    gte: timeBounds.min!.toISOString(),
                    lte: timeBounds.max!.toISOString(),
                  },
                },
                params: {},
              },
              query: {
                range: {
                  [timeField]: {
                    format: 'strict_date_optional_time',
                    gte: timeBounds.min!.toISOString(),
                    lte: timeBounds.max!.toISOString(),
                  },
                },
              },
            }
          : {
              meta: { index: args.index, params: {}, field: timeField },
              query: { match_all: {} },
            };
        const query = buildQueryFromFilters(
          [timeFilter, ...get<any, any>(input, 'filters', [])],
          undefined,
          false
        );
        const res = await data.search
          .search({
            params: {
              size: 0,
              index: args.index,
              body: {
                aggs: JSON.parse(args.query),
                query: { bool: query },
              },
            },
          })
          .toPromise();
        const overwrittenFieldTypes = args.overwrittenFieldTypes
          ? JSON.parse(args.overwrittenFieldTypes)
          : {};
        const rows = flatten(res.rawResponse);
        const columns = Object.keys(rows[0]).map(key => ({
          id: key,
          name: key,
          type: overwrittenFieldTypes[key] || typeof rows[0][key],
          formatHint:
            (overwrittenFieldTypes[key] || typeof rows[0][key]) === 'date'
              ? { id: 'date' }
              : undefined,
        }));

        return {
          type: 'kibana_datatable',
          columns,
          rows,
        };
      },
    });
    editorFrame.registerDatasource(
      core.getStartServices().then(([coreStart, { data }]) =>
        getEsDSLDatasource({
          core: coreStart,
          storage: new Storage(localStorage),
          data,
        })
      ) as Promise<Datasource>
    );
  }
}
