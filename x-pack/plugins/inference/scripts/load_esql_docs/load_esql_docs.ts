/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { ESQLMessage, EditorError, getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import FastGlob from 'fast-glob';
import Fs from 'fs/promises';
import { compact } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import yargs, { Argv } from 'yargs';
import { lastValueFrom } from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import { INLINE_ESQL_QUERY_REGEX } from '../../common/tasks/nl_to_esql/constants';
import { correctCommonEsqlMistakes } from '../../common/tasks/nl_to_esql/correct_common_esql_mistakes';
import { connectorIdOption, elasticsearchOption, kibanaOption } from '../util/cli_options';
import { getServiceUrls } from '../util/get_service_urls';
import { KibanaClient } from '../util/kibana_client';
import { selectConnector } from '../util/select_connector';
import { syncBuiltDocs } from './built-docs';
import { extractDocEntries } from './extract_doc_entries';

yargs(process.argv.slice(2))
  .command(
    '*',
    'Extract ES|QL documentation',
    (y: Argv) =>
      y
        .option('logLevel', {
          describe: 'Log level',
          string: true,
          default: process.env.LOG_LEVEL || 'info',
          choices: ['info', 'debug', 'silent', 'verbose'],
        })
        .option('only', {
          describe: 'Only regenerate these files',
          string: true,
          array: true,
        })
        .option('dryRun', {
          describe: 'Do not write or delete any files',
          boolean: true,
          default: false,
        })
        .option('kibana', kibanaOption)
        .option('elasticsearch', elasticsearchOption)
        .option('connectorId', connectorIdOption),
    (argv) => {
      run(
        async ({ log }) => {
          const serviceUrls = await getServiceUrls({
            log,
            elasticsearch: argv.elasticsearch,
            kibana: argv.kibana,
          });

          const kibanaClient = new KibanaClient(log, serviceUrls.kibanaUrl);

          const connectors = await kibanaClient.getConnectors();
          if (!connectors.length) {
            throw new Error('No connectors found');
          }
          const connector = await selectConnector({
            connectors,
            preferredId: argv.connectorId,
            log,
          });
          log.info(`Using connector ${connector.connectorId}`);

          const chatClient = kibanaClient.createInferenceClient({
            connectorId: connector.connectorId,
          });

          const builtDocsDir = Path.join(REPO_ROOT, '../built-docs');
          log.info(`Looking in ${builtDocsDir} for built-docs repository`);

          await syncBuiltDocs({ builtDocsDir, log });

          const files = FastGlob.sync(
            `${builtDocsDir}/html/en/elasticsearch/reference/master/esql*.html`
          );
          if (!files.length) {
            throw new Error('No files found');
          }

          const fsLimiter = pLimit(10);

          log.info(`Processing ${files.length} files`);

          const documents = await Promise.all(
            files.map((file) => fsLimiter(() => extractDocEntries({ file, log })))
          );

          const flattened = documents.flat().filter((doc) => {
            // ES|QL aggregate functions, ES|QL mathematical functions, ES|QL string functions etc
            const isOverviewArticle =
              doc.title.startsWith('ES|QL') ||
              doc.title === 'Functions overview' ||
              doc.title === 'Operators overview';

            if (isOverviewArticle) {
              log.debug('Dropping overview article', doc.title);
            }
            return !isOverviewArticle;
          });

          const outDir = Path.join(__dirname, '../../server/tasks/nl_to_esql/esql_docs');

          if (!argv.dryRun) {
            log.info(`Writing ${flattened.length} documents to disk to ${outDir}`);
          }

          if (!argv.only && !argv.dryRun) {
            log.debug(`Clearing ${outDir}`);

            await Fs.readdir(outDir, { recursive: true })
              .then((filesInDir) => {
                const limiter = pLimit(10);
                return Promise.all(filesInDir.map((file) => limiter(() => Fs.unlink(file))));
              })
              .catch((error) => (error.code === 'ENOENT' ? Promise.resolve() : error));
          }

          if (!argv.dryRun) {
            await Fs.mkdir(outDir).catch((error) =>
              error.code === 'EEXIST' ? Promise.resolve() : error
            );
          }
          const chatLimiter = pLimit(10);

          const allContent = flattened
            .map((doc) => `## ${doc.title}\n\n${doc.content}\n\(end of ${doc.title})`)
            .join('\n\n');

          const allErrors: Array<{
            title: string;
            fileName: string;
            errors: Array<{ query: string; errors: Array<ESQLMessage | EditorError> }>;
          }> = [];

          async function writeFile(doc: { title: string; content: string }) {
            const fileName = Path.join(
              outDir,
              `esql-${doc.title.replaceAll(' ', '-').toLowerCase()}.txt`
            );

            doc.content = doc.content.replaceAll(INLINE_ESQL_QUERY_REGEX, (match, query) => {
              const correctionResult = correctCommonEsqlMistakes(query);
              if (correctionResult.isCorrection) {
                log.info(
                  `Corrected ES|QL, from:\n${correctionResult.input}\nto:\n${correctionResult.output}`
                );
              }
              return '```esql\n' + correctionResult.output + '\n```';
            });

            const queriesWithSyntaxErrors = compact(
              await Promise.all(
                Array.from(doc.content.matchAll(INLINE_ESQL_QUERY_REGEX)).map(
                  async ([match, query]) => {
                    const { errors, warnings } = await validateQuery(query, getAstAndSyntaxErrors, {
                      // setting this to true, we don't want to validate the index / fields existence
                      ignoreOnMissingCallbacks: true,
                    });

                    const all = [...errors, ...warnings];
                    if (all.length) {
                      log.warning(
                        `Error in ${fileName}:\n${JSON.stringify({ errors, warnings }, null, 2)}`
                      );
                      return {
                        errors: all,
                        query,
                      };
                    }
                  }
                )
              )
            );

            if (queriesWithSyntaxErrors.length) {
              allErrors.push({
                title: doc.title,
                fileName,
                errors: queriesWithSyntaxErrors,
              });
            }

            if (!argv.dryRun) {
              await Fs.writeFile(fileName, doc.content);
            }
          }

          await Promise.all(
            flattened.map(async (doc) => {
              if (doc.skip || (argv.only && !argv.only.includes(doc.title))) {
                return undefined;
              }

              if (!doc.instructions) {
                return fsLimiter(() => writeFile(doc));
              }

              return chatLimiter(async () => {
                try {
                  const response = await lastValueFrom(
                    chatClient.output('generate_markdown', {
                      connectorId: chatClient.getConnectorId(),
                      system: `## System instructions

                    Your job is to generate technical documentation in Markdown format based on content that is scraped from the Elasticsearch website.

                    The documentation is about ES|QL, or the Elasticsearch Query Language, which is a new piped language that can be
                    used for loading, extracting and transforming data stored in Elasticsearch. The audience for the documentation
                    you generate, is intended for an LLM, to be able to answer questions about ES|QL or generate and execute ES|QL
                    queries.

                    If you need to generate example queries, make sure they are different, in that they use different commands, and arguments,
                    to show case how a command, function or operator can be used in different ways.

                    When you generate a complete ES|QL query, always wrap it in code blocks with the language being \`esql\`.. Here's an example:

                    \`\`\`esql
                    FROM logs-*
                    | WHERE @timestamp <= NOW()
                    \`\`\`

                    **If you are describing the syntax of a command, only wrap it in SINGLE backticks.
                    Leave out the esql part**. Eg:
                    ### Syntax:

                    \`DISSECT input "pattern" [APPEND_SEPARATOR="<separator>"]\`

                    #### Context

                    These is the entire documentation, use it as context for answering questions

                    ${allContent}
                    `,
                      input: `Generate Markdown for the following document:

                    ## ${doc.title}

                    ### Instructions

                    ${doc.instructions}

                    ### Content of file

                    ${doc.content}`,
                    })
                  );

                  return fsLimiter(() =>
                    writeFile({ title: doc.title, content: response.content! })
                  );
                } catch (error) {
                  log.error(`Error processing ${doc.title}: ${error.stack}`);
                }
              });
            })
          );

          log.warning(
            `Please verify the following queries that had syntax errors\n${JSON.stringify(
              allErrors,
              null,
              2
            )}`
          );
        },
        { log: { defaultLevel: argv.logLevel as any }, flags: { allowUnexpected: true } }
      );
    }
  )
  .parse();
