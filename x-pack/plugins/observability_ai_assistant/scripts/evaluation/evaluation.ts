/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import yargs from 'yargs';
import { run } from '@kbn/dev-cli-runner';
import { Client } from '@elastic/elasticsearch';
import inquirer from 'inquirer';
import * as fastGlob from 'fast-glob';
import Path from 'path';
import chalk from 'chalk';
import * as table from 'table';
import { castArray, omit, sortBy } from 'lodash';
import { TableUserConfig } from 'table';
import { format, parse } from 'url';
import { options } from './cli';
import { getServiceUrls } from './get_service_urls';
import { KibanaClient } from './kibana_client';
import { EvaluationFunction } from './types';
import { MessageRole } from '../../common';

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
            fastGlob.sync(Path.join(__dirname, './scenarios/**/*.ts'));

          if (!scenarios.length) {
            throw new Error('No scenarios to run');
          }

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

          let evaluationFunctions: Array<{
            name: string;
            fileName: string;
            fn: EvaluationFunction;
          }> = [];

          for (const fileName of scenarios) {
            log.info(`Running scenario ${fileName}`);
            const mod = await import(fileName);
            Object.keys(mod).forEach((key) => {
              evaluationFunctions.push({ name: key, fileName, fn: mod[key] });
            });
          }

          if (argv.grep) {
            const lc = argv.grep.toLowerCase();
            evaluationFunctions = evaluationFunctions.filter((fn) =>
              fn.name.toLowerCase().includes(lc)
            );
          }

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

          const sortedEvaluationFunctions = sortBy(evaluationFunctions, 'fileName', 'name');
          let failedCount = 0;
          let totalCount = 0;
          let failedScenarios: { [key: string]: { fileName: string, resultsScore: string, reasoning: string } } = {};

          for (const { name, fileName, fn } of sortedEvaluationFunctions) {
            log.debug(`Executing ${name}`);
            const result = await fn({
              esClient,
              kibanaClient,
              chatClient: kibanaClient.createChatClient({
                connectorId: connector.id!,
                persist: argv.persist,
                title: argv.autoTitle ? undefined : name,
              }),
            });
            log.debug(`Result:`, JSON.stringify(result));
            const output: string[][] = [
              [
                result.messages.find((message) => message.role === MessageRole.User)!.content!,
                '',
                '',
              ],
              result.conversationId
                ? [
                  `${format(omit(parse(serviceUrls.kibanaUrl), 'auth'))}/${argv.spaceId ? `s/${argv.spaceId}/` : ''
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
                String(score.score),//score.score === 0 ? chalk.redBright('failed') : chalk.greenBright('passed'),
                score.reasoning,
              ]);
            });
            log.write(table.table(output, tableConfig));

            let totalResults = result.scores.length;
            let failedResults = result.scores.filter((score) => score.score < 1).length;

            if (failedResults / totalResults > 0) {
              let reasoningConcat = result.scores.map(score => score.reasoning).join(' ');
              failedScenarios[name] = {
                "fileName": String(fileName.split("/").at(-2)),
                "resultsScore": `Failed ${failedResults} tests out of ${totalResults}`,
                "reasoning": `Reasoning: ${reasoningConcat}`
              }
            }

            log.write(`Total number of tests failed: ${failedResults} out of ${totalResults}`);

            totalCount = totalCount + totalResults
            failedCount = failedCount + failedResults
          }

          log.write(`Total number of tests failed: ${failedCount} out of ${totalCount}`);
          log.write(`Number of scenarios failed: ${Object.keys(failedScenarios).length} out of ${Object.keys(sortedEvaluationFunctions).length}`);
          log.write(failedScenarios)
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
