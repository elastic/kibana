/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';

import {
  EsVersion,
  FunctionalTestRunner,
  readConfigFile,
  runElasticsearch,
  runKibanaServer,
} from '@kbn/test';

import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';

import pRetry from 'p-retry';
import { getLocalhostRealIp } from '../endpoint/common/localhost_services';
// import { parseTestFileConfig } from './utils';

(async () => {
  const argv = {
    ftrConfigFile: '../../../../../../x-pack/test/security_solution_cypress/cli_config',
    _: [],
  };

  const esPorts: number[] = [9200, 9220];
  const kibanaPorts: number[] = [5601, 5620];
  const fleetServerPorts: number[] = [8220];

  const getEsPort = <T>(): T | number => {
    return 9222;
    // const esPort = parseInt(`92${Math.floor(Math.random() * 89) + 10}`, 10);
    // if (esPorts.includes(esPort)) {
    //   return getEsPort();
    // }
    // esPorts.push(esPort);
    // return esPort;
  };

  const getKibanaPort = <T>(): T | number => {
    return 5622;
    // const kibanaPort = parseInt(`56${Math.floor(Math.random() * 89) + 10}`, 10);
    // if (kibanaPorts.includes(kibanaPort)) {
    //   return getKibanaPort();
    // }
    // kibanaPorts.push(kibanaPort);
    // return kibanaPort;
  };

  const getFleetServerPort = <T>(): T | number => {
    const fleetServerPort = parseInt(`82${Math.floor(Math.random() * 89) + 10}`, 10);
    if (fleetServerPorts.includes(fleetServerPort)) {
      return getFleetServerPort();
    }
    fleetServerPorts.push(fleetServerPort);
    return fleetServerPort;
  };

  const cleanupServerPorts = ({
    esPort,
    kibanaPort,
    fleetServerPort,
  }: {
    esPort: number;
    kibanaPort: number;
    fleetServerPort: number;
  }) => {
    _.pull(esPorts, esPort);
    _.pull(kibanaPorts, kibanaPort);
    _.pull(fleetServerPorts, fleetServerPort);
  };

  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const hostRealIp = getLocalhostRealIp();

  const isOpen = argv._[0] === 'open';

  await withProcRunner(log, async (procs) => {
    const abortCtrl = new AbortController();

    const onEarlyExit = (msg: string) => {
      log.error(msg);
      abortCtrl.abort();
    };

    const esPort: number = getEsPort();
    const kibanaPort: number = getKibanaPort();
    const fleetServerPort: number = getFleetServerPort();
    const configFromTestFile = {}; // parseTestFileConfig(filePath);

    const config = await readConfigFile(
      log,
      EsVersion.getDefault(),
      _.isArray(argv.ftrConfigFile) ? _.last(argv.ftrConfigFile) : argv.ftrConfigFile,
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
        },
      },
      (vars) => {
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

        if (
          // @ts-expect-error
          configFromTestFile?.enableExperimental?.length &&
          _.some(vars.kbnTestServer.serverArgs, (value) =>
            value.includes('--xpack.securitySolution.enableExperimental')
          )
        ) {
          vars.kbnTestServer.serverArgs = _.filter(
            vars.kbnTestServer.serverArgs,
            (value) => !value.includes('--xpack.securitySolution.enableExperimental')
          );
          vars.kbnTestServer.serverArgs.push(
            `--xpack.securitySolution.enableExperimental=${JSON.stringify(
              configFromTestFile?.enableExperimental
            )}`
          );
        }

        if (hasFleetServerArgs) {
          vars.kbnTestServer.serverArgs.push(
            `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`,
            `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
          );
        }

        return vars;
      }
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
      ci: process.env.CI,
    };

    const shutdownEs = await pRetry(
      async () =>
        runElasticsearch({
          config,
          log,
          name: `ftr-${esPort}-${Math.random().toString(36).substring(2)}`,
          esFrom: 'snapshot',
          onEarlyExit,
        }),
      { retries: 2, forever: false }
    );

    await runKibanaServer({
      procs,
      config,
      installDir: options?.installDir,
      extraKbnOpts:
        options?.installDir || options?.ci || !isOpen
          ? []
          : ['--dev', '--no-dev-config', '--no-dev-credentials'],
      onEarlyExit,
    });

    await providers.loadAll();

    const functionalTestRunner = new FunctionalTestRunner(log, config, EsVersion.getDefault());

    const customEnv = await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
      retries: 1,
    });

    if (process.send) {
      process.send({
        esPort,
        kibanaPort,
        customEnv,
      });
    }

    await new Promise((resolve) => {
      process.on('message', async (message) => {
        if (message === 'cleanup') {
          await procs.stop('kibana');
          await shutdownEs();
          resolve(0);
        }

        // eslint-disable-next-line no-process-exit
        process.exit(0);
      });
    });
  });
})();
