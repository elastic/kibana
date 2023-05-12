/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable import/no-default-export */

const serverArgs = [
  '--server.port=5620',
  '--status.allowAnonymous=true',
  '--elasticsearch.hosts=http://localhost:9220',
  '--elasticsearch.username=kibana_system',
  '--elasticsearch.password=changeme',
  '--data.search.aggs.shardDelay.enabled=true',
  '--security.showInsecureClusterWarning=false',
  '--telemetry.banner=false',
  '--telemetry.optIn=false',
  '--telemetry.sendUsageTo=staging',
  '--server.maxPayload=1679958',
  // '--plugin-path=/Users/patrykkopycinski/Projects/kibana/test/common/plugins/newsfeed',
  // '--plugin-path=/Users/patrykkopycinski/Projects/kibana/test/common/plugins/otel_metrics',
  '--newsfeed.service.urlRoot=http://localhost:5620',
  '--newsfeed.service.pathTemplate=/api/_newsfeed-FTS-external-service-simulators/kibana/v{VERSION}.json',
  '--logging.appenders.deprecation={"type":"console","layout":{"type":"json"}}',
  '--logging.loggers=[{"name":"elasticsearch.deprecation","level":"all","appenders":["deprecation"]}]',
  '--server.uuid=5b2de169-2785-441b-ae8c-186a1936b17d',
  '--xpack.maps.showMapsInspectorAdapter=true',
  '--xpack.maps.preserveDrawingBuffer=true',
  '--xpack.security.encryptionKey="wuGNaIhoMpk5sO4UBxgr3NyW1sFcLgIf"',
  '--xpack.encryptedSavedObjects.encryptionKey="DkdXazszSCYexXqz4YktBGHCRkV6hyNK"',
  '--xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled=true',
  '--savedObjects.maxImportPayloadBytes=10485760',
  '--savedObjects.allowHttpApiAccess=false',
  '--csp.warnLegacyBrowsers=false',
  '--csp.strict=false',
  '--elasticsearch.ssl.certificateAuthorities=/Users/patrykkopycinski/Projects/kibana/packages/kbn-dev-utils/certs/ca.crt',
  `--xpack.securitySolution.enableExperimental=${JSON.stringify([
    'endpointRbacEnabled',
    'endpointResponseActionsEnabled',
  ])}`,
  // '--xpack.fleet.agents.fleet_server.hosts=["https://host.docker.internal:8220"]',
  // '--xpack.fleet.agents.elasticsearch.host=http://host.docker.internal:9220',
  // '--xpack.fleet.packages.0.name=osquery_manager',
  // '--xpack.fleet.packages.0.version=latest',
];

import { omit } from 'lodash';
import yargs from 'yargs';
import cypress from 'cypress';
// import globby from 'globby';
import deepMerge from 'deepmerge';
import { createTestServers } from '@kbn/core-test-helpers-kbn-server/src/create_root';

// import cypressConfig from '../../../public/management/cypress.config';

export default async () => {
  console.error('process.argv', yargs.parse(process.argv));

  console.log(JSON.stringify(yargs.parse(serverArgs), null, 2));

  console.log('process.env.CYPRESS_THREAD;', process.env.CYPRESS_THREAD);

  const HOSTNAME = 'localhost';
  const ES_PORT = process.env.CYPRESS_THREAD ? 9220 + Number(process.env.CYPRESS_THREAD) : 9220;
  const KIBANA_PORT = process.env.CYPRESS_THREAD ? 5620 + Number(process.env.CYPRESS_THREAD) : 5620;

  const servers = createTestServers({
    adjustTimeout: (t) => t,
    settings: {
      es: {
        clusterName: `es-test-cluster-${process.env.CYPRESS_THREAD || 0}`,
        license: 'trial',
        esArgs: [
          'path.repo=/tmp/',
          'xpack.security.authc.api_key.enabled=true',
          'cluster.routing.allocation.disk.threshold_enabled=true',
          'xpack.security.enabled=true',
          'http.host=0.0.0.0',
        ],
        esFrom: 'snapshot',
        ssl: false,
        port: ES_PORT,
      },
      kbn: {
        ...omit(yargs.parse(serverArgs), ['_', '$0']),
        server: {
          port: KIBANA_PORT,
        },
        cliArgs: {
          oss: false,
        },
      },
    },
  });

  const es = await servers.startES();

  try {
    const kibana = await servers.startKibana();
    console.error('kibana', kibana, kibana);
    console.error('kibana', kibana, kibana.root.server.env);
    console.error('kibana', kibana, kibana.coreStart.http.getServerInfo());
  } catch (e) {
    console.error('error', e);
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
      },
    },
  };

  if (yargs.parse(process.argv)._.includes('open')) {
    return cypress.open({
      configFile: './public/management/cypress.config.ts',
      ...commonCypressConfig,
    });
  }

  const runOptions = await cypress.cli.parseRunArguments(process.argv.slice(2));
  console.log('runOptions', runOptions);
  return cypress
    .run(
      deepMerge(runOptions, {
        ...runOptions,
        commonCypressConfig,
      })
    )
    .then((results) => {
      process.exit();
    })
    .catch((e) => {
      process.exit();
    });
};
