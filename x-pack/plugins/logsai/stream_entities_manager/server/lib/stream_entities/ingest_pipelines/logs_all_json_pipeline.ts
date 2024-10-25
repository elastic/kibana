/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSET_VERSION } from '../../../../common/constants';

export const logsAllJsonPipeline = {
  id: 'logs-all@json-pipeline',
  processors: [
    {
      rename: {
        if: "ctx.message instanceof String && ctx.message.startsWith('{') && ctx.message.endsWith('}')",
        field: 'message',
        target_field: '_tmp_json_message',
        ignore_missing: true,
      },
    },
    {
      json: {
        if: 'ctx._tmp_json_message != null',
        field: '_tmp_json_message',
        add_to_root: true,
        add_to_root_conflict_strategy: 'merge' as const,
        allow_duplicate_keys: true,
        on_failure: [
          {
            rename: {
              field: '_tmp_json_message',
              target_field: 'message',
              ignore_missing: true,
            },
          },
        ],
      },
    },
    {
      dot_expander: {
        if: 'ctx._tmp_json_message != null',
        field: '*',
        override: true,
      },
    },
    {
      remove: {
        field: '_tmp_json_message',
        ignore_missing: true,
      },
    },
  ],
  _meta: {
    description: 'automatic parsing of JSON log messages',
    managed: true,
  },
  version: ASSET_VERSION,
};
