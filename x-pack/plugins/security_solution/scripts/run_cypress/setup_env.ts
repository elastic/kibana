/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { withProcRunner } from '@kbn/dev-proc-runner';
import yargs from 'yargs';
import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer } from '@kbn/test';
import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import pRetry from 'p-retry';
import { getFtrConfig } from './get_ftr_config';

(async () => {
  const { argv } = yargs(process.argv.slice(2)[0].split(' '))
    .coerce('specFilePath', (specFilePath) => path.resolve(specFilePath))
    .coerce('ftrConfigFile', (ftrConfigFile) => path.resolve(ftrConfigFile))
    .default('esPort', 9222)
    .default('kibanaPort', 5622)
    .default('fleetServerPort', 8220)
    .default('isOpen', false);

  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  await withProcRunner(log, async (procs) => {
    const abortCtrl = new AbortController();

    const onEarlyExit = (msg: string) => {
      log.error(msg);
      abortCtrl.abort();
    };

    const config = await getFtrConfig({
      log,
      specFilePath: argv.specFilePath as string,
      ftrConfigFile: argv.ftrConfigFile as string,
      esPort: argv.esPort,
      kibanaPort: argv.kibanaPort,
      fleetServerPort: argv.fleetServerPort,
    });

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
          name: `ftr-${argv.esPort}`,
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
        options?.installDir || options?.ci
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
        esPort: argv.esPort,
        kibanaPort: argv.kibanaPort,
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
