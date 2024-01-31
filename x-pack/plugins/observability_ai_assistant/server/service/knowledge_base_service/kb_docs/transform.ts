/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import type { Logger } from '@kbn/logging';
import type { ObservabilityAIAssistantService } from '../..';

export function addTransformDocsToKb({
  service,
}: {
  service: ObservabilityAIAssistantService;
  logger: Logger;
}) {
  service.addCategoryToKnowledgeBase('transform', [
    {
      id: 'transform_how_it_works',
      texts: [
        `Transforms enable you to convert existing Elasticsearch indices into summarized indices, which provide opportunities for new insights and analytics. For example, you can use transforms to pivot your data into entity-centric indices that summarize the behavior of users or sessions or other entities in your data. Or you can use transforms to find the latest document among all the documents that have a certain unique key.
        There are two types of transforms:

      * Pivot transform: which is used to pivot your data into a new entity-centric index. By transforming and summarizing your data, it becomes possible to visualize and analyze it in alternative and interesting ways.
      * Latest transform, which is used to copy the most recent documents into a new index.

      An example pivot transform:

      \`\`\`
      {
        "source": {
          "index": "kibana_sample_data_ecommerce",
          "query": {
            "term": {
              "geoip.continent_name": {
                "value": "Asia"
              }
            }
          }
        },
        "pivot": {
          "group_by": {
            "customer_id": {
              "terms": {
                "field": "customer_id",
                "missing_bucket": true
              }
            }
          },
          "aggregations": {
            "max_price": {
              "max": {
                "field": "taxful_total_price"
              }
            }
          }
        },
        "description": "Maximum priced ecommerce data by customer_id in Asia",
        "dest": {
          "index": "kibana_sample_data_ecommerce_transform1",
          "pipeline": "add_timestamp_pipeline"
        },
        "frequency": "5m",
        "sync": {
          "time": {
            "field": "order_date",
            "delay": "60s"
          }
        },
        "retention_policy": {
          "time": {
            "field": "order_date",
            "max_age": "30d"
          }
        }
      }
      \`\`\`


      An example latest transform:

      \`\`\`
      {
        "source": {
          "index": "kibana_sample_data_ecommerce"
        },
        "latest": {
          "unique_key": ["customer_id"],
          "sort": "order_date"
        },
        "description": "Latest order for each customer",
        "dest": {
          "index": "kibana_sample_data_ecommerce_transform2"
        },
        "frequency": "5m",
        "sync": {
          "time": {
            "field": "order_date",
            "delay": "60s"
          }
        }
      }
      \`\`\`
      `,
        `Elasticsearch aggregations can be used in pivot transforms through the pivot parameter.

      The query parameter is optional and can be used to filter the source index. It takes an Elasticsearch query object.

      There can only be either 'pivot' or 'latest' parameter in a transform. If both are specified, the transform will fail.
      `,
      ],
    },
    {
      id: 'transform_requirements',
      texts: [
        `There can only be either 'pivot' or 'latest' parameter in a transform. If both are specified, the transform will fail.

        Creating, editing, and cloning transform requires the following privileges:

        * cluster: manage_transform (the transform_admin built-in role grants this privilege)
        * source indices: read, view_index_metadata
        * destination index: read, create_index, index. If a retention_policy is configured, the delete privilege is also required.
      `,
      ],
    },
    {
      id: 'transform_put',
      texts: [
        `There can only be either 'pivot' or 'latest' parameter in a transform. If both are specified, the transform will fail.

        Creating, editing, and cloning transform requires the following privileges:

        * cluster: manage_transform (the transform_admin built-in role grants this privilege)
        * source indices: read, view_index_metadata
        * destination index: read, create_index, index. If a retention_policy is configured, the delete privilege is also required.
      `,
      ],
    },
  ]);
}
