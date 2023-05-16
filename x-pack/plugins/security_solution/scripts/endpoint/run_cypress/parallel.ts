/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

import yargs from 'yargs';
import _ from 'lodash';
import globby from 'globby';
import pMap from 'p-map';
import deepMerge from 'deepmerge';
import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner } from '@kbn/dev-proc-runner';
import {
  FunctionalTestRunner,
  readConfigFile,
  runElasticsearch,
  runKibanaServer,
  EsVersion,
} from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import { getLocalhostRealIp } from '../common/localhost_services';

import runCypress from '.';
import { renderSummaryTable } from './print_run';

export default async () => {
  const { argv } = yargs(process.argv.slice(2));

  const files = await globby([
    // 'cypress/e2e/cases/creation.cy.ts',
    // 'cypress/e2e/cases/privileges.cy.ts',
    '**/cypress/e2e/cases/*.cy.ts',
    // '**/cypress/e2e/detection_alerts/*.cy.ts',
    // '**/cypress/e2e/detection_rules/*.cy.ts',
  ]);

  // console.error('process', process);
  console.error('process.argv', argv);
  console.error('files', files);

  const esPorts: number[] = [9200, 9220];
  const kibanaPorts: number[] = [5601, 5620];
  const fleetServerPorts: number[] = [8220];

  const getEsPort = () => {
    console.error('getEsPort', esPorts);
    const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
    if (esPorts.includes(esPort)) {
      return getEsPort();
    }
    esPorts.push(esPort);
    return esPort;
  };

  const getKibanaPort = () => {
    console.error('getKibanaPort', kibanaPorts);
    const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
    if (kibanaPorts.includes(kibanaPort)) {
      return getKibanaPort();
    }
    kibanaPorts.push(kibanaPort);
    return kibanaPort;
  };

  const getFleetServerPort = () => {
    console.error('getFleetServerPort', fleetServerPorts);
    const fleetServerPort = parseInt(`82${Math.floor(Math.random() * 89) + 10}`, 10);
    if (fleetServerPorts.includes(fleetServerPort)) {
      return getFleetServerPort();
    }
    fleetServerPorts.push(fleetServerPort);
    return fleetServerPort;
  };

  const cleanupServerPorts = ({ esPort, kibanaPort }) => {
    _.pull(esPorts, esPort);
    _.pull(kibanaPorts, kibanaPort);
  };

  // merge({
  //   files: ['../../../target/kibana-security-solution/cypress/results/*.json'],
  // }).then((report) => {
  //   console.error('report', report);
  //   const reporter = new Spec({ stats: report.stats, on: () => {}, once: () => {} });
  //   reporter.epilogue();
  //   renderSummaryTable(undefined, report);
  //   process.exit();
  // });

  // renderSummaryTable(undefined, deepMerge.all(results));

  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  const hostRealIp = await getLocalhostRealIp();

  await pMap(
    files,
    // [files[0]],
    async (filePath, index) => {
      const esPort = getEsPort();
      const kibanaPort = getKibanaPort();
      const fleetServerPort = getFleetServerPort();

      const config = await readConfigFile(
        log,
        EsVersion.getDefault(),
        argv.ftrConfigFile,
        {
          servers: {
            elasticsearch: {
              port: esPort,
            },
            kibana: {
              port: kibanaPort,
            },
            fleetserver: {
              port: fleetServerPort,
            },
          },
          kbnTestServer: {
            serverArgs: [
              `--server.port=${kibanaPort}`,
              `--elasticsearch.hosts=http://localhost:${esPort}`,
            ],
            env: {
              cypress: {
                env: {
                  CYPRESS_SPEC_PATTERN: `**/${filePath}`,
                },
              },
            },
          },
        },
        (vars) => {
          console.error('vars', vars);

          const hasFleetServerArgs = _.some(
            vars.kbnTestServer.serverArgs,
            (value) =>
              value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
              value.includes('--xpack.fleet.agents.elasticsearch.host')
          );

          vars.kbnTestServer.serverArgs = _.filter(
            vars.kbnTestServer.serverArgs,
            (value) =>
              !(
                value.includes('--elasticsearch.hosts=http://localhost:9220') ||
                value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
                value.includes('--xpack.fleet.agents.elasticsearch.host')
              )
          );

          if (hasFleetServerArgs) {
            vars.kbnTestServer.serverArgs.push(
              `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`,
              `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
            );
          }

          return vars;
        }
      );

      console.error(
        'xxxxx2',
        config,
        config.get('servers'),
        config.get('kbnTestServer.serverArgs')
      );

      const lifecycle = new Lifecycle(log);

      const providers = new ProviderCollection(log, [
        ...readProviderSpec('Service', {
          lifecycle: () => lifecycle,
          log: () => log,
          config: () => config,
        }),
        ...readProviderSpec('Service', config.get('services')),
      ]);

      const options = {
        installDir: process.env.KIBANA_INSTALL_DIR,
      };

      console.error('options', options, kibanaPort);

      const shutdownEs = await runElasticsearch({
        config,
        log,
        name: `ftr-${esPort}`,
        esFrom: 'snapshot',
      });

      const procs = new ProcRunner(log);

      await runKibanaServer({
        procs,
        config,
        installDir: options?.installDir,
        extraKbnOpts: options?.installDir
          ? []
          : ['--dev', '--no-dev-config', '--no-dev-credentials'],
      });

      await providers.loadAll();

      const functionalTestRunner = new FunctionalTestRunner(log, config, EsVersion.getDefault());

      return functionalTestRunner
        .run()
        .catch(() => 1)
        .finally(() => {
          cleanupServerPorts({ esPort, kibanaPort });
        });
      // return runCypress({ esPort, kibanaPort, filePath, index, argv })
      //   .then((result) => {
      //     cleanupServerPorts({ esPort, kibanaPort });
      //     return result;
      //   })
      //   .catch((error) => {
      //     cleanupServerPorts({ esPort, kibanaPort });
      //     console.error('ERROR', error);
      //     return error;
      //   });
    },
    { concurrency: 4 }
  ).then((results) => {
    console.error('results', results);
    // renderSummaryTable(undefined, deepMerge.all(results));
    process.exit(_.some(results, (result) => result > 0) ? 1 : 0);
  });
  // ).then(() => {
  //   merge({
  //     files: ['../../../target/kibana-security-solution/cypress/results/*.json'],
  //   }).then((report) => {
  //     const reporter = new Spec({ stats: report.stats, on: () => {} });
  //     reporter.epilogue();
  //     process.exit();
  //   });
  // });
};
