/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ShortIdTable, Tokenizer } from '@kbn/inference-common';
import { chunk, partition } from 'lodash';
import pLimit from 'p-limit';
import { FetchResponseError } from '@kbn/kibana-api-cli';
import { runRecipe } from '@kbn/inference-cli';

/**
 * This recipe classifies prompts from user telemetry for the
 * Observability AI Assistant. This telemetry is no longer
 * recorded, so it's here for educational purposes.
 */

runRecipe(async ({ inferenceClient, kibanaClient, log, signal }) => {
  // this assumes the schema of `ebt-kibana-server` in the telemetry cluster.
  // two fields used are `timestamp` and `properties.prompt`.

  const SOURCE_INDEX = ':INVALID_INDEX_NAME';
  const TARGET_INDEX = SOURCE_INDEX;

  const response = await kibanaClient.es.search<{ properties: { prompt: string } }>({
    index: SOURCE_INDEX,
    track_total_hits: true,
    size: 10000,
    sort: {
      timestamp: {
        order: 'desc',
      },
    },
  });

  log.info(`Downloaded ${response.hits.hits.length} documents`);

  const table = new ShortIdTable();

  const itemsToProcess = response.hits.hits.map((hit) => {
    let text = hit._source!.properties.prompt.trim();
    const id = hit._id!;

    let data: undefined | any[] | Record<string, unknown>;

    // screen descriptions are added to the prompt. this
    // regex accounts for changes in different versions
    // in some cases `prompt` is structured data.
    const [prompt, ...screenDescriptions] = text.split(
      /((\|)|(\\n\\n)|(\s*))(The user is looking at|The user has APM data)/
    );

    const screenDescription = screenDescriptions.join('');

    if (screenDescription) {
      text = prompt.trim();
    }

    // if it's structured data, parse it.
    try {
      if (text.startsWith('[') && text.endsWith(']')) {
        data = JSON.parse(text);
      } else if (text.startsWith('{') && text.endsWith('}')) {
        data = JSON.parse(text);
      } else if (text.startsWith('{')) {
        const dataText = text.split('}|')[0] + '}';
        data = JSON.parse(dataText);
      }
    } catch (err) {
      // sometimes folks parse in JSON responses from Dev Tools w/ multiline etc which fails to parse
    }

    // everything after /app/ are the relevant parts of the URL
    const [, ...urlParts] = screenDescription.split('/app/');
    let url = urlParts.join('/app/');
    // take until the dot
    url = url.split(/(\.|\s|$|\n)/)[0];

    const app = url ? url.split('/')[0] : undefined;

    let type = 'prompt';

    if (data && 'instructions' in data) {
      type = 'contextual_insight';
    } else if (data && 'connectors' in data) {
      type = 'connector';
    }

    return {
      _id: id,
      shortId: table.take(id),
      screen: screenDescription
        ? {
            description: screenDescription ? `The user is looking at ${screenDescription}` : '',
            url,
            app,
          }
        : null,
      type,
      original: text,
      prompt: data ? null : prompt.trim(),
      truncated: Tokenizer.truncate(prompt, 500),
      _index: hit._index!,
      _source: hit._source,
    };
  });

  const itemsWithPrompts = itemsToProcess.filter((item) => !!item.prompt);

  // limit to 25 prompts per call, to prevent output tokens from exceeding the limit
  const batches = chunk(itemsWithPrompts, 25);

  log.info(`Processing ${itemsWithPrompts.length} prompts in ${batches.length} batches`);

  const limiter = pLimit(20);

  let finished = 0;
  let failures = 0;

  const logProgressIntervalId = setInterval(() => {
    log.info(`Progress: completed ${finished} out of ${batches.length} total, ${failures} failed`);
  }, 5000);

  signal.addEventListener('abort', () => {
    clearInterval(logProgressIntervalId);
  });

  const results = await Promise.allSettled(
    batches.map((batch, index) => {
      const input = `Classify the given prompt. It's from a user of the
      Observability AI Assistant. Tag each prompt with one or more
      topics. Use the following tags if applicable:

      - \`query\`: the user asks questions about their data, such as:
        - "Show me my zookeeper logs over the last 15 minutes"
        - "Give me the slowest transactions"
        - "Generate an ES|QL query that lists all the services"
      - \`es\`: the user asks questions about their Elasticsearch
      instance, such as:
        - "What is the status of my cluster"
      - \`product-help\`: the user asks for help with the Elastic
      products, such as:
        - "How do I install an ingest pipeline"
      - \`screen\`: the user asks questions about the things
      that are on their screen (they are looking at Kibana), such as:
        - "Explain this dashboard" when they are on /app/dashboards
        - "What does this error mean" when they are on /app/apm/{serviceName}/errors
      - \`rca\`: the user wants the assistant to explain why
      something is happening, such as:
        - "What causes this alert?"
        - "What caused this error?"
      - \`signals\`: the user wants to retrieve signals, such as alerts,
      anomalies or SLO/SLIs
      
      If you see other topics, generate a new tag, using lowercase
      and alphanumerical characters.

      Additionally, tag the language using ISO 639‑1, prefixed by \`lang\`,
      such as: \`lang-en\`

      ## Prompts

      ${JSON.stringify(
        batch.map((prompt) => ({
          id: prompt.shortId,
          text: prompt.truncated,
          url: prompt.screen?.url ?? 'unknown',
        }))
      )}
      `;

      return limiter(() => {
        log.debug(`inference: started batch ${index} out of ${batches.length}`);
        return inferenceClient.output({
          id: 'classify_prompts',
          input,
          schema: {
            type: 'object',
            properties: {
              prompts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                    },
                    tags: {
                      type: 'array',
                      items: {
                        type: 'string',
                      },
                    },
                  },
                  required: ['id', 'tags'],
                },
              },
            },
            required: ['prompts'],
          } as const,
        });
      })
        .catch((error) => {
          failures++;
          if (error instanceof FetchResponseError) {
            return error.response.json().then((res) => {
              log.warning(
                `Failed to get results: "${error.message}" with ${JSON.stringify(
                  res
                )}, input token count was ${Tokenizer.count(input)}`
              );
              throw error;
            });
          }
          log.warning(`Failed to get results: ${error.message}`);
          throw error;
        })
        .finally(() => {
          finished++;
          log.debug(`inference: settled batch ${index} out of ${batches.length}`);
        });
    })
  );

  clearInterval(logProgressIntervalId);

  const tagsByShortId = new Map<string, string[]>();

  results.forEach((result) => {
    if (result.status === 'rejected') {
      return;
    }
    result.value.output.prompts?.forEach((prompt) => {
      tagsByShortId.set(prompt.id, prompt.tags);
    });
  });

  log.info(`Completed: processed ${itemsToProcess.length} prompts, ${failures} batches failed`);

  const docs = itemsToProcess.map((item) => {
    const itemTags = tagsByShortId.get(item.shortId);

    const [lang, otherTags] = partition(itemTags, (tag) => tag.startsWith('lang-'));

    return {
      prompt: item.prompt,
      tags: otherTags,
      type: item.type,
      language: lang.map((tag) => tag.split('lang-')[1]),
      screen: item.screen,
      _id: item._id,
      _source: item._source,
      _index: item._index,
    };
  });

  const bulkBatches = chunk(docs, 100);

  log.info(`Bulk indexing ${docs.length} docs in ${bulkBatches.length} batches`);

  const batchLimiter = pLimit(5);
  await Promise.allSettled(
    bulkBatches.map((batch, index) => {
      const operations = batch.flatMap((doc) => {
        return [
          {
            index: {
              _index: TARGET_INDEX,
              _id: doc._id,
            },
          },
          {
            ...doc._source,
            prompt: doc.prompt,
            screen: doc.screen,
            tags: doc.tags,
            type: doc.type,
            language: doc.language,
          },
        ];
      });

      return batchLimiter(() => {
        log.debug(`bulk: starting batch ${index} out of ${batches.length}`);
        return kibanaClient.es
          .bulk({
            operations,
            refresh: true,
          })
          .then((result) => {
            if (result.errors) {
              const failed = result.items.filter((item) => Object.values(item)[0].error);
              log.warning(
                `Some documents failed to index: ${failed.length}, example: ${JSON.stringify(
                  failed[0]
                )}`
              );
              return;
            }
          })
          .catch((error) => {
            log.warning(`Failed indexing bulk request: ${error.message}`);
          })
          .finally(() => {
            log.debug(`bulk: settled batch ${index} out of ${batches.length}`);
          });
      });
    })
  );

  log.info(`Completed bulk indexing`);
});
