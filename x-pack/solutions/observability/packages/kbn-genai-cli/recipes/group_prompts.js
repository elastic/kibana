/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
var __assign =
  (this && this.__assign) ||
  function () {
    __assign =
      Object.assign ||
      function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (const p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
    return __assign.apply(this, arguments);
  };
const __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
const __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    let _ = {
      label: 0,
      sent: function () {
        if (t[0] & 1) throw t[1];
        return t[1];
      },
      trys: [],
      ops: [],
    };
    let f;
    let y;
    let t;
    let g;
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return function (v) {
        return step([n, v]);
      };
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.');
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y.return
                  : op[0]
                  ? y.throw || ((t = y.return) && t.call(y), 0)
                  : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  };
Object.defineProperty(exports, '__esModule', { value: true });
const inference_common_1 = require('@kbn/inference-common');
const short_id_table_1 = require('@kbn/observability-utils-common/llm/short_id_table');
const lodash_1 = require('lodash');
const p_limit_1 = require('p-limit');
const kibana_api_cli_1 = require('@kbn/kibana-api-cli');
const run_recipe_1 = require('../utils/run_recipe');
/**
 * This recipe classifies prompts from user telemetry for the
 * Observability AI Assistant. This telemetry is no longer
 * recorded, so it's here for educational purposes.
 */
(0, run_recipe_1.runRecipe)(function (_a) {
  const inferenceClient = _a.inferenceClient;
  const kibanaClient = _a.kibanaClient;
  const log = _a.log;
  const signal = _a.signal;
  return __awaiter(void 0, void 0, void 0, function () {
    let SOURCE_INDEX;
    let TARGET_INDEX;
    let response;
    let table;
    let itemsToProcess;
    let itemsWithPrompts;
    let batches;
    let limiter;
    let finished;
    let failures;
    let logProgressIntervalId;
    let results;
    let tagsByShortId;
    let docs;
    let bulkBatches;
    let batchLimiter;
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          SOURCE_INDEX = ':INVALID_INDEX_NAME';
          TARGET_INDEX = SOURCE_INDEX;
          return [
            4 /*yield*/,
            kibanaClient.es.search({
              index: SOURCE_INDEX,
              track_total_hits: true,
              size: 10000,
              sort: {
                timestamp: {
                  order: 'desc',
                },
              },
            }),
          ];
        case 1:
          response = _b.sent();
          log.info('Downloaded '.concat(response.hits.hits.length, ' documents'));
          table = new short_id_table_1.ShortIdTable();
          itemsToProcess = response.hits.hits.map(function (hit) {
            let text = hit._source.properties.prompt.trim();
            const id = hit._id;
            let data;
            // screen descriptions are added to the prompt. this
            // regex accounts for changes in different versions
            // in some cases `prompt` is structured data.
            const _a = text.split(
              /((\|)|(\\n\\n)|(\s*))(The user is looking at|The user has APM data)/
            );
            const prompt = _a[0];
            const screenDescriptions = _a.slice(1);
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
            const _b = screenDescription.split('/app/');
            const urlParts = _b.slice(1);
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
                    description: screenDescription
                      ? 'The user is looking at '.concat(screenDescription)
                      : '',
                    url: url,
                    app: app,
                  }
                : null,
              type: type,
              original: text,
              prompt: data ? null : prompt.trim(),
              truncated: inference_common_1.Tokenizer.truncate(prompt, 500),
              _index: hit._index,
              _source: hit._source,
            };
          });
          itemsWithPrompts = itemsToProcess.filter(function (item) {
            return !!item.prompt;
          });
          batches = (0, lodash_1.chunk)(itemsWithPrompts, 25);
          log.info(
            'Processing '
              .concat(itemsWithPrompts.length, ' prompts in ')
              .concat(batches.length, ' batches')
          );
          limiter = (0, p_limit_1.default)(20);
          finished = 0;
          failures = 0;
          logProgressIntervalId = setInterval(function () {
            log.info(
              'Progress: completed '
                .concat(finished, ' out of ')
                .concat(batches.length, ' total, ')
                .concat(failures, ' failed')
            );
          }, 5000);
          signal.addEventListener('abort', function () {
            clearInterval(logProgressIntervalId);
          });
          return [
            4 /*yield*/,
            Promise.allSettled(
              batches.map(function (batch, index) {
                const input =
                  'Classify the given prompt. It\'s from a user of the\n      Observability AI Assistant. Tag each prompt with one or more\n      topics. Use the following tags if applicable:\n\n      - `query`: the user asks questions about their data, such as:\n        - "Show me my zookeeper logs over the last 15 minutes"\n        - "Give me the slowest transactions"\n        - "Generate an ES|QL query that lists all the services"\n      - `es`: the user asks questions about their Elasticsearch\n      instance, such as:\n        - "What is the status of my cluster"\n      - `product-help`: the user asks for help with the Elastic\n      products, such as:\n        - "How do I install an ingest pipeline"\n      - `screen`: the user asks questions about the things\n      that are on their screen (they are looking at Kibana), such as:\n        - "Explain this dashboard" when they are on /app/dashboards\n        - "What does this error mean" when they are on /app/apm/{serviceName}/errors\n      - `rca`: the user wants the assistant to explain why\n      something is happening, such as:\n        - "What causes this alert?"\n        - "What caused this error?"\n      - `signals`: the user wants to retrieve signals, such as alerts,\n      anomalies or SLO/SLIs\n      \n      If you see other topics, generate a new tag, using lowercase\n      and alphanumerical characters.\n\n      Additionally, tag the language using ISO 639\u20111, prefixed by `lang`,\n      such as: `lang-en`\n\n      ## Prompts\n\n      '.concat(
                    JSON.stringify(
                      batch.map(function (prompt) {
                        let _a;
                        let _b;
                        return {
                          id: prompt.shortId,
                          text: prompt.truncated,
                          url:
                            (_b =
                              (_a = prompt.screen) === null || _a === void 0 ? void 0 : _a.url) !==
                              null && _b !== void 0
                              ? _b
                              : 'unknown',
                        };
                      })
                    ),
                    '\n      '
                  );
                return limiter(function () {
                  log.debug(
                    'inference: started batch '.concat(index, ' out of ').concat(batches.length)
                  );
                  return inferenceClient.output({
                    id: 'classify_prompts',
                    input: input,
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
                    },
                  });
                })
                  .catch(function (error) {
                    failures++;
                    if (error instanceof kibana_api_cli_1.FetchResponseError) {
                      return error.response.json().then(function (res) {
                        log.warning(
                          'Failed to get results: "'
                            .concat(error.message, '" with ')
                            .concat(JSON.stringify(res), ', input token count was ')
                            .concat(inference_common_1.Tokenizer.count(input))
                        );
                        throw error;
                      });
                    }
                    log.warning('Failed to get results: '.concat(error.message));
                    throw error;
                  })
                  .finally(function () {
                    finished++;
                    log.debug(
                      'inference: settled batch '.concat(index, ' out of ').concat(batches.length)
                    );
                  });
              })
            ),
          ];
        case 2:
          results = _b.sent();
          clearInterval(logProgressIntervalId);
          tagsByShortId = new Map();
          results.forEach(function (result) {
            let _a;
            if (result.status === 'rejected') {
              return;
            }
            (_a = result.value.output.prompts) === null || _a === void 0
              ? void 0
              : _a.forEach(function (prompt) {
                  tagsByShortId.set(prompt.id, prompt.tags);
                });
          });
          log.info(
            'Completed: processed '
              .concat(itemsToProcess.length, ' prompts, ')
              .concat(failures, ' batches failed')
          );
          docs = itemsToProcess.map(function (item) {
            const itemTags = tagsByShortId.get(item.shortId);
            const _a = (0, lodash_1.partition)(itemTags, function (tag) {
              return tag.startsWith('lang-');
            });
            const lang = _a[0];
            const otherTags = _a[1];
            return {
              prompt: item.prompt,
              tags: otherTags,
              type: item.type,
              language: lang.map(function (tag) {
                return tag.split('lang-')[1];
              }),
              screen: item.screen,
              _id: item._id,
              _source: item._source,
              _index: item._index,
            };
          });
          bulkBatches = (0, lodash_1.chunk)(docs, 100);
          log.info(
            'Bulk indexing '.concat(docs.length, ' docs in ').concat(bulkBatches.length, ' batches')
          );
          batchLimiter = (0, p_limit_1.default)(5);
          return [
            4 /*yield*/,
            Promise.allSettled(
              bulkBatches.map(function (batch, index) {
                const operations = batch.flatMap(function (doc) {
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
                return batchLimiter(function () {
                  log.debug(
                    'bulk: starting batch '.concat(index, ' out of ').concat(batches.length)
                  );
                  return kibanaClient.es
                    .bulk({
                      operations: operations,
                      refresh: true,
                    })
                    .then(function (result) {
                      if (result.errors) {
                        const failed = result.items.filter(function (item) {
                          return Object.values(item)[0].error;
                        });
                        log.warning(
                          'Some documents failed to index: '
                            .concat(failed.length, ', example: ')
                            .concat(JSON.stringify(failed[0]))
                        );
                        return;
                      }
                    })
                    .catch(function (error) {
                      log.warning('Failed indexing bulk request: '.concat(error.message));
                    })
                    .finally(function () {
                      log.debug(
                        'bulk: settled batch '.concat(index, ' out of ').concat(batches.length)
                      );
                    });
                });
              })
            ),
          ];
        case 3:
          _b.sent();
          log.info('Completed bulk indexing');
          return [2 /*return*/];
      }
    });
  });
});
