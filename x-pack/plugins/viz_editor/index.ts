/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { Legacy } from 'kibana';
import { resolve } from 'path';
import { API_PREFIX, PLUGIN_ID } from './common';

export function vizEditor(kibana: any) {
  return new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: `xpack.${PLUGIN_ID}`,
    publicDir: resolve(__dirname, 'public'),
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    uiExports: {
      app: {
        title: 'Viz Editor',
        description: 'Explore and visualize data.',
        main: `plugins/${PLUGIN_ID}/app`,
        icon: 'plugins/kibana/assets/visualize.svg',
        euiIconType: 'visualizeApp',
      },
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
    },

    config(joi: Joi.Root) {
      return joi
        .object({
          enabled: joi.boolean().default(true),
        })
        .default();
    },

    init(server: Legacy.Server) {
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');

      server.route({
        path: `${API_PREFIX}/search`,
        method: 'POST',
        async handler(req) {
          const { payload } = req;
          const result = await callWithRequest(req, 'search', payload);

          if (result.aggregations) {
            return tablify(
              result.aggregations.groupBy.buckets.map(({ key, ...agg }: any) => ({
                ...key,
                ...agg,
              }))
            );
          }

          if (!result.hits || !result.hits.hits) {
            return {
              columns: [],
              rows: [],
            };
          }

          return tablify(result.hits.hits);
        },
      });
    },
  });
}

function tablify(docs: any) {
  const cols = new Set<string>();
  const sanitizeFieldName = (field: string) => field.replace(/^_source\./, '');

  function toTable(rawDoc: any, prefix = '') {
    const table: any = {};
    const flatten = (path: string, doc: any) => {
      Object.keys(doc).forEach(prop => {
        const val = doc[prop];

        // We're not supporting arrays for now...
        if (Array.isArray(val)) {
          return;
        }

        // If we've got a nested object, recur
        if (val && typeof val === 'object') {
          return flatten(path + prop + '.', val);
        }

        // If we're at a leaf, add it to the result
        const field = sanitizeFieldName(path + prop);

        cols.add(field);
        table[field] = val;
      });
    };

    flatten(prefix, rawDoc);

    return table;
  }

  const rows = docs.map((doc: any) => toTable(doc));

  return {
    columns: Array.from(cols).map(name => ({ name })),
    rows,
  };
}
