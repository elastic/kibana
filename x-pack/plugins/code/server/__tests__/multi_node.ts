/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import getPort from 'get-port';
import { resolve } from 'path';
import { Root } from 'src/core/server/root';
import { createRootWithCorePlugins, request, startTestServers } from 'src/test_utils/kbn_server';

describe('code in multiple nodes', () => {
  const codeNodeUuid = 'c4add484-0cba-4e05-86fe-4baa112d9e53';
  let port: number;
  let codeNode: Root;
  let nonCodeNode: Root;

  let servers: any;
  const pluginPaths = resolve(__dirname, '../../../../../node_modules/x-pack');

  async function startServers() {
    port = await getPort();
    servers = await startTestServers({
      adjustTimeout: t => {
        // @ts-ignore
        this.timeout(t);
      },
      settings: {
        kbn: {
          server: {
            uuid: codeNodeUuid,
            port,
          },
          plugins: { paths: [pluginPaths] },
          xpack: {
            upgrade_assistant: {
              enabled: false,
            },
            code: {
              codeNode: true,
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
      plugins: { paths: [pluginPaths] },
      xpack: {
        upgrade_assistant: {
          enabled: false,
        },
        code: { codeNode: false },
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
    await request.get(nonCodeNode, '/api/code/setup').expect(502);
    await codeNode.setup();
    await delay(2000);
    await request.get(nonCodeNode, '/api/code/setup').expect(200);
    // @ts-ignore
  }).timeout(20000);

  it('cluster uuid should equals Code node uuid', async () => {
    const url = `http://localhost:${port}`;
    await request.get(codeNode, '/api/code/cluster').expect(200, {
      uuid: codeNodeUuid,
      url,
    });
    await request.get(nonCodeNode, '/api/code/cluster').expect(200, {
      uuid: codeNodeUuid,
      url,
    });
  });
});
