/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ListToolsResponse } from '@kbn/onechat-plugin/common/http_api/tools';
import { AGENT_BUILDER_ENABLED_SETTING_ID } from '@kbn/management-settings-ids';
import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import { spaceUrl } from '../utils/spaces';
import { createTool, deleteTool } from '../utils/tools';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const spaces = getService('spaces');
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');

  describe('FOO - Space support', () => {
    const testTools: Array<{ toolId: string; spaceId: string }> = [
      { toolId: 'default-tool-1', spaceId: 'default' },
      { toolId: 'default-tool-2', spaceId: 'default' },
      { toolId: 'space1-tool-1', spaceId: 'space-1' },
      { toolId: 'space1-tool-2', spaceId: 'space-1' },
      { toolId: 'space2-tool-1', spaceId: 'space-2' },
    ];

    before(async () => {
      await spaces.create({
        id: 'space-1',
        name: 'space-1',
        disabledFeatures: [],
      });
      await kibanaServer.uiSettings.update(
        {
          [AGENT_BUILDER_ENABLED_SETTING_ID]: true,
        },
        { space: 'space-1' }
      );

      await spaces.create({
        id: 'space-2',
        name: 'space-2',
        disabledFeatures: [],
      });
      await kibanaServer.uiSettings.update(
        {
          [AGENT_BUILDER_ENABLED_SETTING_ID]: true,
        },
        { space: 'space-2' }
      );

      await es.indices.create({
        index: 'spaces-test-index',
        mappings: { dynamic: true },
      });

      for (const tool of testTools) {
        await createTool({ id: tool.toolId }, { space: tool.spaceId, supertest });
      }
    });

    after(async () => {
      for (const tool of testTools) {
        await deleteTool(tool.toolId, { space: tool.spaceId, supertest });
      }

      await es.indices.delete({ index: 'spaces-test-index' });

      await spaces.delete('space-1');
      await spaces.delete('space-2');
    });

    describe('Space support for tools', () => {
      for (const spaceId of ['default', 'space-1', 'space-2']) {
        it(`should list the correct tools in the "${spaceId}" space`, async () => {
          const response = await supertest
            .get(spaceUrl('/api/agent_builder/tools', spaceId))
            .set('kbn-xsrf', 'kibana')
            .expect(200);

          const res = response.body as ListToolsResponse;
          const tools = res.results.filter((tool) => !tool.readonly);

          const expectedTools = testTools
            .filter((tool) => tool.spaceId === spaceId)
            .map((tool) => tool.toolId)
            .sort();
          expect(tools.map((tool) => tool.id).sort()).to.eql(expectedTools);
        });
      }
    });
  });
}
