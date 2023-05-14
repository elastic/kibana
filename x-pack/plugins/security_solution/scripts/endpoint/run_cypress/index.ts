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
import { KbnClient, readConfigFile, EsVersion } from '@kbn/test';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server/src/create_root';
import { extendEsArchiver } from '@kbn/ftr-common-functional-services/services/kibana_server';

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

  console.error('argv.ftrConfigFile', yargsData.ftrConfigFile);
  // console.error('process.argv', argv);
  // console.error('argv', argv);

  // console.log(JSON.stringify(yargs.parse(serverArgs), null, 2));

  // console.log('process.env.CYPRESS_THREAD;', process.env.CYPRESS_THREAD);

  const log = new ToolingLog({
    level: 'debug',
    writeTo: process.stdout,
  });

  const { default: getStackConfig } = await import(
    yargsData.ftrConfigFile ?? '../../../../../test/security_solution_cypress/config'
  );

  // console.log('moduleA', getStackConfig);

  // const ftrConfigFile = fs.readFileSync(argv.ftrConfigFile, 'utf-8');

  // const ftrConfigFile = require.resolve(argv.ftrConfigFile);

  // console.error('ftrConfigFile', ftrConfigFile);

  const ftrConfig = await getStackConfig({
    readConfigFile: (path) => readConfigFile(log, EsVersion.getDefault(), path),
  });

  console.error('ftrConfig', ftrConfig);

  const HOSTNAME = 'localhost';
  const ES_PORT = esPort;
  const KIBANA_PORT = kibanaPort;

  const servers = createTestServers({
    adjustTimeout: (t) => t,
    settings: {
      es: {
        clusterName: `es-test-cluster-${process.env.CYPRESS_THREAD || index || 0}`,
        license: 'trial',
        esArgs: ftrConfig.esTestCluster.serverArgs,
        esFrom: 'snapshot',
        ssl: false,
        port: ES_PORT,
      },
      kbn: {
        ...omit(yargs.parse(ftrConfig.kbnTestServer.serverArgs), [
          '_',
          '$0',
          'pluginPath',
          'plugin-path',
        ]),
        status: {
          allowAnonymous: true,
        },
        server: {
          port: KIBANA_PORT,
        },
        cliArgs: {
          oss: false,
          watch: true,
        },
      },
    },
  });

  const es = await servers.startES();

  let kibana;
  try {
    kibana = await servers.startKibana();
  } catch (e) {
    console.error('error', e);
  }

  const kbnClient = new KbnClient({
    log,
    url: Url.format({
      protocol: 'http',
      hostname: 'localhost',
      port: KIBANA_PORT,
      auth: 'elastic:changeme',
      username: 'elastic',
      password: 'changeme',
    }),
    certificateAuthorities: ftrConfig.servers.kibana.certificateAuthorities,
    // uiSettingDefaults: defaults,
  });

  const esArchiver = new EsArchiver({
    // baseDir: config.get('esArchiver.baseDirectory'),
    client: kibana?.coreStart.elasticsearch.client.asInternalUser,
    log,
    kbnClient,
  });

  extendEsArchiver({
    esArchiver,
    kibanaServer: kbnClient,
    // retry,
    // defaults: config.get('uiSettings.defaults'),
  });

  if (ftrConfig.esArchiver?.archives?.length) {
    await pMap(ftrConfig.esArchiver?.archives, (path) => esArchiver.load(path), { concurrency: 1 });
  }

  const commonCypressConfig = {
    env: {
      KIBANA_URL: `http://${HOSTNAME}:${KIBANA_PORT}`,
      ELASTICSEARCH_USERNAME: 'elastic',
      ELASTICSEARCH_PASSWORD: 'changeme',
      ELASTICSEARCH_URL: es.hosts[0],
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
  return cypress.run(deepMerge(runOptions, commonCypressConfig));
  // .then((results) => {
  //   process.exit();
  // })
  // .catch((e) => {
  //   process.exit();
  // });
};
