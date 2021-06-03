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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const usageSchema: MakeSchemaFrom<any> = {
  live_query_usage: {
    // session is an awkward name for this
    session: {
      count: {
        type: 'long',
      },
      errors: {
        type: 'long',
      },
    },
    cumulative: {
      queries: {
        type: 'long',
      },
    },
  },
  scheduled_queries: {
    queryGroups: {
      total: {
        type: 'long',
      },
      empty: {
        type: 'long',
      },
    },
  },
  agent_info: {
    enrolled: {
      type: 'long',
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
          // ???: add a dimension on these for agent instance
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
