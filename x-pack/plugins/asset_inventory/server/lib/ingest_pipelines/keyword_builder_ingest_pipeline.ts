/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

const PIPELINE_ID = 'entity-keyword-builder@platform';

const buildIngestPipeline = (): IngestProcessorContainer[] => {
  return [
    {
      script: {
        lang: 'painless',
        on_failure: [
          {
            set: {
              field: 'error.message',
              value:
                'Processor {{ _ingest.on_failure_processor_type }} with tag {{ _ingest.on_failure_processor_tag }} in pipeline {{ _ingest.on_failure_pipeline }} failed with message {{ _ingest.on_failure_message }}',
            },
          },
        ],

        // There are two layers of language to string scape on this script.
        // - One is in javascript
        // - Another one is in painless.
        //
        // .e.g, in painless we want the following line:
        //    entry.getKey().replace("\"", "\\\"");
        //
        // To do so we must scape each backslash in javascript, otherwise the backslashes will only scape the next character
        // and the backslashes won't end up in the painless layer
        //
        // The code then becomes:
        //    entry.getKey().replace("\\"", "\\\\\\"");
        // That is one extra backslash per backslash (there is no need to scape quotes in the javascript layer)
        source: `
            String jsonFromMap(Map map) {
              StringBuilder json = new StringBuilder("{");
              boolean first = true;
              for (entry in map.entrySet()) {
                  if (!first) {
                      json.append(",");
                  }
                  first = false;
                  String key = entry.getKey().replace("\\"", "\\\\\\"");
                  Object value = entry.getValue();
                  json.append("\\"").append(key).append("\\":");
                  
                  if (value instanceof String) {
                      String escapedValue = ((String) value).replace("\\"", "\\\\\\"").replace("=", ":");
                      json.append("\\"").append(escapedValue).append("\\"");
                  } else if (value instanceof Map) {
                      json.append(jsonFromMap((Map) value));
                  } else if (value instanceof List) {
                      json.append(jsonFromList((List) value));
                  } else if (value instanceof Boolean || value instanceof Number) {
                      json.append(value.toString());
                  } else {
                      // For other types, treat as string
                      String escapedValue = value.toString().replace("\\"", "\\\\\\"").replace("=", ":");
                      json.append("\\"").append(escapedValue).append("\\"");
                  }
              }
              json.append("}");
              return json.toString();
          }

          String jsonFromList(List list) {
              StringBuilder json = new StringBuilder("[");
              boolean first = true;
              for (item in list) {
                  if (!first) {
                      json.append(",");
                  }
                  first = false;
                  if (item instanceof String) {
                      String escapedItem = ((String) item).replace("\\"", "\\\\\\"").replace("=", ":");
                      json.append("\\"").append(escapedItem).append("\\"");
                  } else if (item instanceof Map) {
                      json.append(jsonFromMap((Map) item));
                  } else if (item instanceof List) {
                      json.append(jsonFromList((List) item));
                  } else if (item instanceof Boolean || item instanceof Number) {
                      json.append(item.toString());
                  } else {
                      // For other types, treat as string
                      String escapedItem = item.toString().replace("\\"", "\\\\\\"").replace("=", ":");
                      json.append("\\"").append(escapedItem).append("\\"");
                  }
              }
              json.append("]");
              return json.toString();
          }

          if (ctx.entities?.metadata == null) {
            return;
          }

          def keywords = [];
          for (key in ctx.entities.metadata.keySet()) {
            def value = ctx.entities.metadata[key];
            def metadata = jsonFromMap([key: value]);  
            keywords.add(metadata);
          }

          ctx['entities']['keyword'] = keywords;
          `,
      },
    },
    {
      set: {
        field: 'event.ingested',
        value: '{{{_ingest.timestamp}}}',
      },
    },
  ];
};

// developing the pipeline is a bit tricky, so we have a debug mode
// set  xpack.securitySolution.entityAnalytics.entityStore.developer.pipelineDebugMode
// to true to keep the enrich field and the context field in the document to help with debugging.
export const createKeywordBuilderPipeline = async ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  const pipeline = {
    id: PIPELINE_ID,
    body: {
      _meta: {
        managed_by: 'entity_store',
        managed: true,
      },
      description: `Serialize entities.metadata into a keyword field`,
      processors: buildIngestPipeline(),
    },
  };

  logger.debug(`Attempting to create pipeline: ${JSON.stringify(pipeline)}`);

  await esClient.ingest.putPipeline(pipeline);
};

export const deleteKeywordBuilderPipeline = ({
  logger,
  esClient,
}: {
  logger: Logger;
  esClient: ElasticsearchClient;
}) => {
  logger.debug(`Attempting to delete pipeline: ${PIPELINE_ID}`);
  return esClient.ingest.deletePipeline(
    {
      id: PIPELINE_ID,
    },
    {
      ignore: [404],
    }
  );
};
