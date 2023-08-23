/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */


import execa from 'execa';
import path from 'path';
import { ToolingLog } from '@kbn/tooling-log';
import { ProcRunner, withProcRunner } from '@kbn/dev-proc-runner';
import yargs from 'yargs';
import { EsVersion, FunctionalTestRunner, runElasticsearch, runKibanaServer, Config } from '@kbn/test';
import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';
import pRetry from 'p-retry';
import { getFtrConfig } from '@kbn/security-solution-plugin/scripts/run_cypress/get_ftr_config';

export const setupEnv = (on: Cypress.PluginEvents, cypressConfig: Cypress.PluginConfigOptions) => {
  const log = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });

  const procs = new ProcRunner(log);
  let shutdownEs;

  on('before:run', async (details) => {
    console.error(details);
    const specFile = details.specs[0];
    // log.error(specFile);
      console.error('cypressConfig', specFile, cypressConfig);
      const { argv } = yargs(process.argv.slice(2)[0].split(' '))
        .coerce('specFilePath', (specFilePath) => path.resolve(specFile.absolute))
        // .coerce('ftrConfigFile', (ftrConfigFile) =>
        //   path.resolve('../../../../../../test/osquery_cypress/cli_config')
        // )
        .default('specFilePath', specFile)
        // .default('ftrConfigFile', path.resolve('../../../test/security_solution_cypress/cli_config'))
        // .default('ftrConfigFile', path.resolve('../../test/osquery_cypress/cli_config'))
        // .coerce('specFilePath', (specFilePath) => path.resolve(specFilePath))
        // .coerce('ftrConfigFile', (ftrConfigFile) => path.resolve(ftrConfigFile))
        .default('esPort', 9222)
        .default('kibanaPort', 5622)
        .default('fleetServerPort', 8220)



      console.error('argv', argv);

      let response = {};




      // await withProcRunner(log, async (procs) => {
        const abortCtrl = new AbortController();

        const onEarlyExit = (msg: string) => {
          log.error(msg);
          abortCtrl.abort();
        };

        const config = await getFtrConfig({
          log,
          specFilePath: argv.specFilePath as string,
          ftrConfigFile: cypressConfig.env.FTR_CONFIG_FILE as string,
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

        shutdownEs = await pRetry(
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


        await pRetry(
          async () =>
            runKibanaServer({
              procs,
              config,
              installDir: options?.installDir,
              extraKbnOpts:
                options?.installDir || options?.ci
                  ? []
                  : ['--dev', '--no-dev-config', '--no-dev-credentials'],
              onEarlyExit,
            }),
          { retries: 2, forever: false }
        );

        await providers.loadAll();

        const functionalTestRunner = new FunctionalTestRunner(log, config, EsVersion.getDefault());

        await pRetry(() => functionalTestRunner.run(abortCtrl.signal), {
          retries: 1,
        });


        // response = async () => {
        //   await procs.stop('kibana');
        //   await shutdownEs();
        //   procs.teardown();

        //   process.exit(0);
        // };
      // });

      return response
  });


  return cypressConfig;
};
