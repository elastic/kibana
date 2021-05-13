/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup } from 'src/core/server';
import { OsqueryAppContext } from '../lib/osquery_app_context_services';
import { MakeSchemaFrom } from '../../../../../src/plugins/usage_collection/server';
import { SetupPlugins } from '../types';

export type CollectorDependencies = {
  osqueryContext: OsqueryAppContext;
  core: CoreSetup;
} & Pick<SetupPlugins, 'usageCollection'>;

export const usageSchema: MakeSchemaFrom<any> = {
  query_metrics: {
    live_query_usage: {
      call_count: {
        type: 'long',
      },
      error_count: {
        type: 'long',
      },
    },
  },
  beat_metrics: {
    usage: {
      cpu: {
        // TODO?: break out into system/user usage
        latest: {
          type: 'long',
        },
        max: {
          type: 'long',
        },
        avg: {
          type: 'long',
        },
      },
      memory: {
        rss: {
          // TODO?: add a dimension on these for agent instance
          latest: {
            type: 'long',
          },
          max: {
            type: 'long',
          },
          avg: {
            type: 'long',
          },
        },
      },
    },
  },
};
