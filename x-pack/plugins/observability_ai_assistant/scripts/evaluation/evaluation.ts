/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { run } from '@kbn/dev-cli-runner';
import * as fastGlob from 'fast-glob';
import inquirer from 'inquirer';
import yargs from 'yargs';
import chalk from 'chalk';
import { castArray, omit } from 'lodash';
// @ts-expect-error
import Mocha from 'mocha';
import Path from 'path';
import * as table from 'table';
import { TableUserConfig } from 'table';
import { format, parse } from 'url';
import { MessageRole } from '../../common';
import { options } from './cli';
import { getServiceUrls } from './get_service_urls';
import { KibanaClient } from './kibana_client';
import { initServices } from './services';
import { setupSynthtrace } from './setup_synthtrace';

function runEvaluations() {
  yargs(process.argv.slice(2))
    .command('*', 'Run AI Assistant evaluations', options, (argv) => {
      run(
        async ({ log }) => {
          const serviceUrls = await getServiceUrls({
            log,
            elasticsearch: argv.elasticsearch,
            kibana: argv.kibana,
          });

          const kibanaClient = new KibanaClient(serviceUrls.kibanaUrl, argv.spaceId);
          const esClient = new Client({
            node: serviceUrls.esUrl,
          });

          const connectors = await kibanaClient.getConnectors();

          if (!connectors.length) {
            throw new Error('No connectors found');
          }

          let connector = connectors.find((item) => item.id === argv.connectorId);

          if (!connector && argv.connectorId) {
            log.warning(`Could not find connector ${argv.connectorId}`);
          }

          if (!connector && connectors.length === 1) {
            connector = connectors[0];
            log.debug('Using the only connector found');
          } else {
            const connectorChoice = await inquirer.prompt({
              type: 'list',
              name: 'connector',
              message: 'Select a connector',
              choices: connectors.map((item) => item.name),
            });

            connector = connectors.find((item) => item.name === connectorChoice.connector)!;
          }

          log.info(`Using connector ${connector.id}`);

          const scenarios =
            (argv.files !== undefined &&
              castArray(argv.files).map((file) => Path.join(process.cwd(), file))) ||
            fastGlob.sync(Path.join(__dirname, './scenarios/**/*.spec.ts'));

          if (!scenarios.length) {
            throw new Error('No scenarios to run');
          }

          log.info('Setting up Synthtrace clients');

          const synthtraceEsClients = await setupSynthtrace({
            target: serviceUrls.kibanaUrl,
            client: esClient,
            log,
          });

          const chatClient = kibanaClient.createChatClient({
            connectorId: connector.id!,
            persist: argv.persist,
          });

          const header: string[][] = [
            [chalk.bold('Criterion'), chalk.bold('Result'), chalk.bold('Reasoning')],
          ];

          const tableConfig: TableUserConfig = {
            singleLine: false,
            border: {
              topBody: `─`,
              topJoin: `┬`,
              topLeft: `┌`,
              topRight: `┐`,

              bottomBody: `─`,
              bottomJoin: `┴`,
              bottomLeft: `└`,
              bottomRight: `┘`,

              bodyLeft: `│`,
              bodyRight: `│`,
              bodyJoin: `│`,

              joinBody: `─`,
              joinLeft: `├`,
              joinRight: `┤`,
              joinJoin: `┼`,
            },
            spanningCells: [
              { row: 0, col: 0, colSpan: 3 },
              { row: 1, col: 0, colSpan: 3 },
            ],
            columns: [
              { wrapWord: true, width: 60 },
              { wrapWord: true },
              { wrapWord: true, width: 60 },
            ],
          };

          chatClient.onResult((result) => {
            log.debug(`Result:`, JSON.stringify(result));
            const output: string[][] = [
              [
                result.messages.find((message) => message.role === MessageRole.User)!.content!,
                '',
                '',
              ],
              result.conversationId
                ? [
                    `${format(omit(parse(serviceUrls.kibanaUrl), 'auth'))}/${
                      argv.spaceId ? `s/${argv.spaceId}/` : ''
                    }app/observabilityAIAssistant/conversations/${result.conversationId}`,
                    '',
                    '',
                  ]
                : ['', '', ''],
              ...header,
            ];

            result.scores.forEach((score) => {
              output.push([
                score.criterion,
                score.score === 0 ? chalk.redBright('failed') : chalk.greenBright('passed'),
                score.reasoning,
              ]);
            });
            log.write(table.table(output, tableConfig));
          });

          initServices({
            kibanaClient,
            esClient,
            chatClient,
            synthtraceEsClients,
          });

          const mocha = new Mocha({
            grep: argv.grep,
            timeout: '5m',
          });

          mocha.suite.beforeAll(async () => {
            if (argv.clear) {
              log.info('Clearing conversations');
              await esClient.deleteByQuery({
                index: '.kibana-observability-ai-assistant-conversations',
                query: {
                  ...(argv.spaceId ? { term: { namespace: argv.spaceId } } : { match_all: {} }),
                },
                refresh: true,
              });
            }
          });

          for (const filename of scenarios) {
            mocha.addFile(filename);
          }

          return new Promise((resolve, reject) => {
            mocha.run((failures: any) => {
              if (failures) {
                reject(new Error(`Some tests failed`));
                return;
              }
              resolve();
            });
          });
        },
        {
          log: {
            defaultLevel: argv.logLevel as any,
          },
          flags: {
            allowUnexpected: true,
          },
        }
      );
    })
    .parse();
}

runEvaluations();
