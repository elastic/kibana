/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getPort from 'get-port';
import { resolve } from 'path';
import { Root } from 'src/core/server/root';
import {
  createRootWithCorePlugins,
  request,
  startTestServers,
} from '../../../../../src/test_utils/kbn_server';

describe('code in multiple nodes', () => {
  const codeNodeUuid = 'c4add484-0cba-4e05-86fe-4baa112d9e53';
  const nonodeNodeUuid = '22b75e04-0e50-4647-9643-6b1b1d88beaf';
  let codePort: number;
  let nonCodePort: number;
  let codeNode: Root;
  let nonCodeNode: Root;

  let servers: any;
  const pluginPaths = resolve(__dirname, '../../../../../x-pack');

  async function startServers() {
    codePort = await getPort();
    nonCodePort = await getPort();
    servers = await startTestServers({
      adjustTimeout: t => {
        // @ts-ignore
        this.timeout(t);
      },
      settings: {
        kbn: {
          server: {
            uuid: codeNodeUuid,
            port: codePort,
          },
          plugins: { paths: [pluginPaths] },
          xpack: {
            upgrade_assistant: {
              enabled: false,
            },
            security: {
              enabled: false,
            },
          },
        },
      },
    });
    codeNode = servers.root;
    await startNonCodeNodeKibana();
  }

  async function startNonCodeNodeKibana() {
    const setting = {
      server: {
        port: nonCodePort,
        uuid: nonodeNodeUuid,
      },
      plugins: { paths: [pluginPaths] },
      xpack: {
        upgrade_assistant: {
          enabled: false,
        },
        code: { codeNodeUrl: `http://localhost:${codePort}` },
        security: {
          enabled: false,
        },
      },
    };
    nonCodeNode = createRootWithCorePlugins(setting);
    await nonCodeNode.setup();
  }
  // @ts-ignore
  before(startServers);

  // @ts-ignore
  after(async function() {
    // @ts-ignore
    this.timeout(10000);
    await nonCodeNode.shutdown();
    await servers.stop();
  });

  function delay(ms: number) {
    return new Promise(resolve1 => {
      setTimeout(resolve1, ms);
    });
  }

  it('Code node setup should be ok', async () => {
    await request.get(codeNode, '/api/code/setup').expect(200);
  });

  it('Non-code node setup should be ok', async () => {
    await request.get(nonCodeNode, '/api/code/setup').expect(200);
  });

  it('Non-code node setup should fail if code node is shutdown', async () => {
    await codeNode.shutdown();
    await delay(2000);
    await request.get(nonCodeNode, '/api/code/setup').expect(502);
    await codeNode.setup();
    await delay(2000);
    await request.get(nonCodeNode, '/api/code/setup').expect(200);
    // @ts-ignore
  }).timeout(20000);
});
