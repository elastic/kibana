/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { ESQLMessage, EditorError, getAstAndSyntaxErrors } from '@kbn/esql-ast';
import { validateQuery } from '@kbn/esql-validation-autocomplete';
import Fs from 'fs/promises';
import { compact } from 'lodash';
import pLimit from 'p-limit';
import Path from 'path';
import yargs, { Argv } from 'yargs';
import { REPO_ROOT } from '@kbn/repo-info';
import { INLINE_ESQL_QUERY_REGEX } from '../../common/tasks/nl_to_esql/constants';
import { correctCommonEsqlMistakes } from '../../common/tasks/nl_to_esql/correct_common_esql_mistakes';
import { connectorIdOption, elasticsearchOption, kibanaOption } from '../util/cli_options';
import { getServiceUrls } from '../util/get_service_urls';
import { KibanaClient } from '../util/kibana_client';
import { selectConnector } from '../util/select_connector';
import { syncBuiltDocs } from './sync-built-docs-repo';
import { extractDocEntries } from './extract_doc_entries';
import { generateDoc } from './generate_doc';

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

          // TODO: uncomment
          // await syncBuiltDocs({ builtDocsDir, log });

          // TODO: uncomment
          // const extraction = await extractDocEntries({
          //   builtDocsDir,
          //   inferenceClient: chatClient,
          //   log,
          // });

          const tempFileName = Path.join(REPO_ROOT, './extraction.json');

          // await Fs.writeFile(tempFileName, JSON.stringify(extraction, undefined, 2));

          const extraction = JSON.parse((await Fs.readFile(tempFileName)).toString('utf-8'));

          const docFiles = await generateDoc({
            extraction,
            inferenceClient: chatClient,
            log,
          });

          // console.log('*** extraction');
          // console.log(JSON.stringify(extraction, undefined, 2));

          const outDir = Path.join(__dirname, '../../server/tasks/nl_to_esql/esql_docs');

          await Promise.all(
            docFiles.map(async (file) => {
              const fileName = Path.join(outDir, file.name);
              await Fs.writeFile(fileName, file.content);
            })
          );

          return;

          if (!argv.dryRun) {
            log.info(`Writing ${docFiles.length} documents to disk to ${outDir}`);
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
