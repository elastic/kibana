/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MsearchResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * This mock response from an Elasticsearch msearch contains two hits, where
 * the first hit is from a similarity (vector) search, and the second hit is a
 * required KB document (terms) search.
 */
export const mockMsearchResponse: MsearchResponse = {
  took: 142,
  responses: [
    {
      took: 142,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 129,
          relation: 'eq',
        },
        max_score: 21.658352,
        hits: [
          {
            _index: '.kibana-elastic-ai-assistant-kb',
            _id: 'fa1c8ba1-25c9-4404-9736-09b7eb7124f8',
            _score: 21.658352,
            _ignored: ['text.keyword'],
            _source: {
              metadata: {
                source:
                  '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/documentation/source_commands/from.asciidoc',
              },
              vector: {
                tokens: {
                  wild: 1.2001507,
                  // truncated for mock
                },
                model_id: '.elser_model_2',
              },
              text: "[[esql-from]]\n=== `FROM`\n\nThe `FROM` source command returns a table with up to 10,000 documents from a\ndata stream, index, or alias. Each row in the resulting table represents a\ndocument. Each column corresponds to a field, and can be accessed by the name\nof that field.\n\n[source,esql]\n----\nFROM employees\n----\n\nYou can use <<api-date-math-index-names,date math>> to refer to indices, aliases\nand data streams. This can be useful for time series data, for example to access\ntoday's index:\n\n[source,esql]\n----\nFROM <logs-{now/d}>\n----\n\nUse comma-separated lists or wildcards to query multiple data streams, indices,\nor aliases:\n\n[source,esql]\n----\nFROM employees-00001,employees-*\n----\n",
            },
          },
        ],
      },
      status: 200,
    },
    {
      took: 3,
      timed_out: false,
      _shards: {
        total: 1,
        successful: 1,
        skipped: 0,
        failed: 0,
      },
      hits: {
        total: {
          value: 14,
          relation: 'eq',
        },
        max_score: 0.034783483,
        hits: [
          {
            _index: '.kibana-elastic-ai-assistant-kb',
            _id: '280d4882-0f64-4471-a268-669a3f8c958f',
            _score: 0.034783483,
            _ignored: ['text.keyword'],
            _source: {
              metadata: {
                source:
                  '/Users/andrew.goldstein/Projects/forks/andrew-goldstein/kibana/x-pack/plugins/elastic_assistant/server/knowledge_base/esql/example_queries/esql_example_query_0001.asciidoc',
                required: true,
                kbResource: 'esql',
              },
              vector: {
                tokens: {
                  user: 1.1084619,
                  // truncated for mock
                },
                model_id: '.elser_model_2',
              },
              text: '[[esql-example-queries]]\n\nThe following is an example an ES|QL query:\n\n```\nFROM logs-*\n| WHERE NOT CIDR_MATCH(destination.ip, "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16")\n| STATS destcount = COUNT(destination.ip) by user.name, host.name\n| ENRICH ldap_lookup_new ON user.name\n| WHERE group.name IS NOT NULL\n| EVAL follow_up = CASE(\n    destcount >= 100, "true",\n     "false")\n| SORT destcount desc\n| KEEP destcount, host.name, user.name, group.name, follow_up\n```\n',
            },
          },
        ],
      },
      status: 200,
    },
  ],
};
