/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

import Url from 'url';
import { EsArchiver } from '@kbn/es-archiver';
import { omit } from 'lodash';
import yargs from 'yargs';
import cypress from 'cypress';
import deepMerge from 'deepmerge';
import { ToolingLog } from '@kbn/tooling-log';
import pMap from 'p-map';
import { runElasticsearch, runKibanaServer, KbnClient, readConfigFile, EsVersion } from '@kbn/test';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server/src/create_root';
import { extendEsArchiver } from '@kbn/ftr-common-functional-services/services/kibana_server';
import { withProcRunner } from '@kbn/dev-proc-runner';
import {
  Lifecycle,
  ProviderCollection,
  readProviderSpec,
} from '@kbn/test/src/functional_test_runner/lib';

export default async (
  { esPort, kibanaPort, filePath: singleSpecPath, index, argv } = {
    esPort: 9220,
    kibanaPort: 5620,
    argv: process.argv.slice(2),
  }
) => {
  console.error('process.argv', process.env);
  console.error('params', singleSpecPath);

  const yargsData = yargs(argv);

  console.error(
    'argv',
    argv,
    yargsData.argv,
    require.resolve(`../../../${yargsData.argv.configFile}`)
  );

  console.error('argv.ftrConfigFile', yargsData.argv.ftrConfigFile);
  // console.error('process.argv', argv);
  // console.error('argv', argv);

  // console.log(JSON.stringify(yargs.parse(serverArgs), null, 2));

  // console.log('process.env.CYPRESS_THREAD;', process.env.CYPRESS_THREAD);

  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  // const { default: getStackConfig } = await import(
  //   yargsData.argv.ftrConfigFile ?? '../../../../../test/security_solution_cypress/config'
  // );

  // console.log('moduleA', getStackConfig);

  // const ftrConfigFile = fs.readFileSync(argv.ftrConfigFile, 'utf-8');

  // const ftrConfigFile = require.resolve(argv.ftrConfigFile);

  // console.error('ftrConfigFile', ftrConfigFile);

  // const ftrConfig = await getStackConfig({
  //   readConfigFile: (path) => readConfigFile(log, EsVersion.getDefault(), path),
  // });

  const ftrConfig = await readConfigFile(
    log,
    EsVersion.getDefault(),
    yargsData.argv.ftrConfigFile,
    {
      servers: {
        elasticsearch: {
          port: esPort,
        },
        kibana: {
          port: kibanaPort,
        },
      },
    }
  );

  console.error('ftrConfig', ftrConfig, ftrConfig.get('servers'), ftrConfig.get('kbnTestServer'));

  console.error('dupa', ftrConfig.get('esArchiver.archives'));

  // console.log('esarchied', await ftrConfig.module.provider, ftrConfig.get('services.esArchiver')());

  const lifecycle = new Lifecycle(log);
  const providers = new ProviderCollection(log, [
    ...readProviderSpec('Service', {
      lifecycle: () => lifecycle,
      log: () => log,
      config: () => ftrConfig,
      // esVersion: () => this.esVersion,
    }),
    ...readProviderSpec('Service', ftrConfig.get('services')),
  ]);

  const HOSTNAME = 'localhost';
  const ES_PORT = esPort;
  const KIBANA_PORT = kibanaPort;

  const options = {
    installDir: process.env.KIBANA_INSTALL_DIR,
  };

  console.error('options', options);

  const shutdownEs = await runElasticsearch({
    config: ftrConfig,
    log,
    name: `ftr-${ES_PORT}`,
    esFrom: 'snapshot',
  });

  await withProcRunner(log, async (procs) => {
    await runKibanaServer({
      procs,
      config: ftrConfig,
      installDir: options?.installDir,
      extraKbnOpts: options?.installDir ? [] : ['--dev', '--no-dev-config', '--no-dev-credentials'],
    }).then(async () => {
      await providers.loadAll();

      if (ftrConfig.get('esArchiver.archives')?.length) {
        const esArchiver = await providers.getService('esArchiver');
        await pMap(ftrConfig.get('esArchiver.archives'), (path) => esArchiver.load(path), {
          concurrency: 1,
        });
      }

      const commonCypressConfig = {
        env: {
          KIBANA_URL: `http://${HOSTNAME}:${KIBANA_PORT}`,
          ELASTICSEARCH_USERNAME: 'elastic',
          ELASTICSEARCH_PASSWORD: 'changeme',
          ELASTICSEARCH_URL: `http://${HOSTNAME}:${ES_PORT}`,
          configport: KIBANA_PORT,
          hostname: HOSTNAME,
        },
        config: {
          e2e: {
            baseUrl: `http://${HOSTNAME}:${KIBANA_PORT}`,
            ...(singleSpecPath ? { specPattern: `**/${singleSpecPath}` } : {}),
          },
        },
      };

      const ftrConfigIndex = argv?.indexOf('--ftr-config-file');
      if (ftrConfigIndex !== -1) {
        argv.splice(ftrConfigIndex, 2);
      }

      if (yargs.parse(argv)._.includes('open')) {
        return cypress.open({
          configFile: require.resolve(`../../../${yargsData.argv.configFile}`),
          ...commonCypressConfig,
        });
      }

      const runOptions = await cypress.cli.parseRunArguments(argv);
      console.log('runOptions', runOptions);
      return cypress.run(
        deepMerge.all([
          runOptions,
          commonCypressConfig,
          {
            numTestsKeptInMemory: 0,
          },
        ])
      );
      // .then((results) => {
      //   process.exit();
      // })
      // .catch((e) => {
      //   process.exit();
      // });
    });
  });

  console.log('shutdownEs', shutdownEs);
};
