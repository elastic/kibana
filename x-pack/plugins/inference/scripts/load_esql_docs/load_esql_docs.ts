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
import { generateDoc, FileToWrite } from './generate_doc';

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
        .option('dryRun', {
          describe: 'Do not write or delete any files',
          boolean: true,
          default: false,
        })
        .option('syncDocs', {
          describe: 'Sync doc repository before generation',
          boolean: true,
          default: true,
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

          if (argv.syncDocs) {
            log.info(`Running sync for built-docs repository in ${builtDocsDir}...`);
            await syncBuiltDocs({ builtDocsDir, log });
          }

          log.info(`Retrieving and converting documentation from ${builtDocsDir}...`);
          const extraction = await extractDocEntries({
            builtDocsDir,
            inferenceClient: chatClient,
            log,
          });

          log.info(`Rewriting documentation...`);
          const docFiles = await generateDoc({
            extraction,
            inferenceClient: chatClient,
            log,
          });

          log.info(`Correcting common ESQL mistakes...`);
          docFiles.forEach((docFile) => {
            docFile.content = docFile.content.replaceAll(
              INLINE_ESQL_QUERY_REGEX,
              (match, query) => {
                const correctionResult = correctCommonEsqlMistakes(query);
                if (correctionResult.isCorrection) {
                  log.info(
                    `Corrected ES|QL, from:\n${correctionResult.input}\nto:\n${correctionResult.output}`
                  );
                }
                return '```esql\n' + correctionResult.output + '\n```';
              }
            );
          });

          const outDir = Path.join(__dirname, '../../server/tasks/nl_to_esql/esql_docs');

          if (!argv.dryRun) {
            log.info(`Writing ${docFiles.length} documents to disk to ${outDir}`);

            await Fs.mkdir(outDir).catch((error) =>
              error.code === 'EEXIST' ? Promise.resolve() : error
            );

            await Promise.all(
              docFiles.map(async (file) => {
                const fileName = Path.join(outDir, file.name);
                await Fs.writeFile(fileName, file.content);
              })
            );
          }

          log.info(`Checking syntax...`);
          const syntaxErrors = (
            await Promise.all(docFiles.map(async (file) => await findEsqlSyntaxError(file)))
          ).flat();

          log.warning(
            `Please verify the following queries that had syntax errors\n${JSON.stringify(
              syntaxErrors,
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

interface SyntaxError {
  query: string;
  errors: Array<ESQLMessage | EditorError>;
}

const findEsqlSyntaxError = async (doc: FileToWrite): Promise<SyntaxError[]> => {
  return Array.from(doc.content.matchAll(INLINE_ESQL_QUERY_REGEX)).reduce(
    async (listP, [match, query]) => {
      const list = await listP;
      const { errors, warnings } = await validateQuery(query, getAstAndSyntaxErrors, {
        // setting this to true, we don't want to validate the index / fields existence
        ignoreOnMissingCallbacks: true,
      });

      const all = [...errors, ...warnings];
      if (all.length) {
        list.push({
          errors: all,
          query,
        });
      }

      return list;
    },
    Promise.resolve([] as SyntaxError[])
  );
};
