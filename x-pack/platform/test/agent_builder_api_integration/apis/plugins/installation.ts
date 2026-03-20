/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import archiver from 'archiver';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { PluginsTestServer } from '../../utils/plugins_server';

const ASSETS_DIR = path.resolve(__dirname, './assets');

const PLUGIN_NAME = 'test-plugin';
const PLUGIN_DESCRIPTION = 'A test plugin for integration testing';
const PLUGIN_VERSION = '1.0.0';
const SKILL_DIR_NAME = 'test-skill';
const EXPECTED_SKILL_ID = `${PLUGIN_NAME}-${SKILL_DIR_NAME}`;
const EXPECTED_SKILL_NAME = 'Test Skill';

const createZipBuffer = async (): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 0 } });
    const chunks: Buffer[] = [];

    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);

    archive.directory(path.join(ASSETS_DIR, PLUGIN_NAME), false);
    void archive.finalize();
  });
};

const getPluginsServerPort = (serverArgs: string[]): number => {
  const githubBaseUrlArg = serverArgs.find((arg) =>
    arg.startsWith('--xpack.agentBuilder.githubBaseUrl=')
  );
  if (!githubBaseUrlArg) {
    throw new Error(
      'Missing --xpack.agentBuilder.githubBaseUrl in kbnTestServer.serverArgs. ' +
        'The plugins test server port must be configured in the FTR config.'
    );
  }
  const url = new URL(githubBaseUrlArg.split('=')[1]);
  return parseInt(url.port, 10);
};

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const log = getService('log');
  const config = getService('config');

  describe('Plugin Installation API', function () {
    this.tags(['skipServerless']);

    let pluginsServer: PluginsTestServer;
    let serverUrl: string;
    let zipBuffer: Buffer;
    const createdPluginIds: string[] = [];

    before(async () => {
      const serverArgs: string[] = config.get('kbnTestServer.serverArgs');
      const port = getPluginsServerPort(serverArgs);
      pluginsServer = new PluginsTestServer({ port, assetsDir: ASSETS_DIR, log });
      await pluginsServer.start();
      serverUrl = pluginsServer.getUrl();
      zipBuffer = await createZipBuffer();
    });

    after(async () => {
      for (const pluginId of createdPluginIds) {
        try {
          await supertest
            .delete(`/api/agent_builder/plugins/${pluginId}`)
            .set('kbn-xsrf', 'kibana')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);
        } catch (error) {
          log.warning(`Failed to cleanup plugin ${pluginId}: ${error.message}`);
        }
      }
      pluginsServer.stop();
    });

    const installFromUrl = (url: string, pluginName?: string) => {
      const body: Record<string, string> = { url };
      if (pluginName) {
        body.plugin_name = pluginName;
      }
      return supertest
        .post('/api/agent_builder/plugins/install')
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', '2023-10-31')
        .send(body);
    };

    const installFromUpload = (pluginName?: string) => {
      let req = supertest
        .post('/internal/agent_builder/plugins/upload')
        .set('kbn-xsrf', 'kibana')
        .attach('file', zipBuffer, 'plugin.zip');
      if (pluginName) {
        req = req.field('plugin_name', pluginName);
      }
      return req;
    };

    const deletePlugin = (pluginId: string) => {
      return supertest
        .delete(`/api/agent_builder/plugins/${pluginId}`)
        .set('kbn-xsrf', 'kibana')
        .set('elastic-api-version', '2023-10-31');
    };

    const listSkills = async () => {
      const response = await supertest.get('/api/agent_builder/skills').expect(200);
      return response.body.results as Array<{
        id: string;
        name: string;
        readonly: boolean;
        plugin_id?: string;
      }>;
    };

    const findPluginSkill = async (skillId: string) => {
      const skills = await listSkills();
      return skills.find((s) => s.id === skillId);
    };

    describe('install from remote zip URL', () => {
      let pluginId: string;

      after(async () => {
        if (pluginId) {
          const idx = createdPluginIds.indexOf(pluginId);
          if (idx !== -1) {
            createdPluginIds.splice(idx, 1);
          }
        }
      });

      it('installs the plugin and returns correct metadata', async () => {
        const response = await installFromUrl(`${serverUrl}/plugins/${PLUGIN_NAME}.zip`).expect(
          200
        );

        pluginId = response.body.id;
        createdPluginIds.push(pluginId);

        expect(response.body.name).to.be(PLUGIN_NAME);
        expect(response.body.version).to.be(PLUGIN_VERSION);
        expect(response.body.description).to.be(PLUGIN_DESCRIPTION);
        expect(response.body.skill_ids).to.contain(EXPECTED_SKILL_ID);
      });

      it('creates the associated skills', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be.ok();
        expect(skill!.name).to.be(EXPECTED_SKILL_NAME);
        expect(skill!.readonly).to.be(true);
        expect(skill!.plugin_id).to.be(PLUGIN_NAME);
      });

      it('uninstalls the plugin', async () => {
        await deletePlugin(pluginId).expect(200);
        const idx = createdPluginIds.indexOf(pluginId);
        if (idx !== -1) {
          createdPluginIds.splice(idx, 1);
        }
      });

      it('removes the associated skills on uninstall', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be(undefined);
      });
    });

    describe('install from GitHub-style URL', () => {
      let pluginId: string;

      after(async () => {
        if (pluginId) {
          const idx = createdPluginIds.indexOf(pluginId);
          if (idx !== -1) {
            createdPluginIds.splice(idx, 1);
          }
        }
      });

      it('installs the plugin and returns correct metadata', async () => {
        const githubUrl = `${serverUrl}/test-owner/${PLUGIN_NAME}/tree/main`;
        const response = await installFromUrl(githubUrl).expect(200);

        pluginId = response.body.id;
        createdPluginIds.push(pluginId);

        expect(response.body.name).to.be(PLUGIN_NAME);
        expect(response.body.version).to.be(PLUGIN_VERSION);
        expect(response.body.description).to.be(PLUGIN_DESCRIPTION);
        expect(response.body.skill_ids).to.contain(EXPECTED_SKILL_ID);
      });

      it('creates the associated skills', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be.ok();
        expect(skill!.name).to.be(EXPECTED_SKILL_NAME);
        expect(skill!.readonly).to.be(true);
        expect(skill!.plugin_id).to.be(PLUGIN_NAME);
      });

      it('uninstalls the plugin', async () => {
        await deletePlugin(pluginId).expect(200);
        const idx = createdPluginIds.indexOf(pluginId);
        if (idx !== -1) {
          createdPluginIds.splice(idx, 1);
        }
      });

      it('removes the associated skills on uninstall', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be(undefined);
      });
    });

    describe('install from zip file upload', () => {
      let pluginId: string;

      after(async () => {
        if (pluginId) {
          const idx = createdPluginIds.indexOf(pluginId);
          if (idx !== -1) {
            createdPluginIds.splice(idx, 1);
          }
        }
      });

      it('installs the plugin and returns correct metadata', async () => {
        const response = await installFromUpload().expect(200);

        pluginId = response.body.id;
        createdPluginIds.push(pluginId);

        expect(response.body.name).to.be(PLUGIN_NAME);
        expect(response.body.version).to.be(PLUGIN_VERSION);
        expect(response.body.description).to.be(PLUGIN_DESCRIPTION);
        expect(response.body.skill_ids).to.contain(EXPECTED_SKILL_ID);
      });

      it('creates the associated skills', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be.ok();
        expect(skill!.name).to.be(EXPECTED_SKILL_NAME);
        expect(skill!.readonly).to.be(true);
        expect(skill!.plugin_id).to.be(PLUGIN_NAME);
      });

      it('uninstalls the plugin', async () => {
        await deletePlugin(pluginId).expect(200);
        const idx = createdPluginIds.indexOf(pluginId);
        if (idx !== -1) {
          createdPluginIds.splice(idx, 1);
        }
      });

      it('removes the associated skills on uninstall', async () => {
        const skill = await findPluginSkill(EXPECTED_SKILL_ID);
        expect(skill).to.be(undefined);
      });
    });

    describe('duplicate installation', () => {
      it('rejects installing the same plugin twice', async () => {
        const response = await installFromUrl(`${serverUrl}/plugins/${PLUGIN_NAME}.zip`).expect(
          200
        );

        createdPluginIds.push(response.body.id);

        const duplicateResponse = await installFromUrl(
          `${serverUrl}/plugins/${PLUGIN_NAME}.zip`
        ).expect(400);

        expect(duplicateResponse.body.message).to.contain('already installed');
      });
    });

    describe('plugin-managed skills are read-only', () => {
      before(async () => {
        const existing = await supertest
          .get('/api/agent_builder/plugins')
          .set('elastic-api-version', '2023-10-31')
          .expect(200);

        const alreadyInstalled = existing.body.results.find(
          (p: { name: string }) => p.name === 'readonly-test-plugin'
        );
        if (alreadyInstalled) {
          return;
        }

        const response = await installFromUrl(
          `${serverUrl}/plugins/${PLUGIN_NAME}.zip`,
          'readonly-test-plugin'
        ).expect(200);

        createdPluginIds.push(response.body.id);
      });

      const readonlySkillId = `readonly-test-plugin-${SKILL_DIR_NAME}`;

      it('rejects updating a plugin-managed skill', async () => {
        await supertest
          .put(`/api/agent_builder/skills/${readonlySkillId}`)
          .set('kbn-xsrf', 'kibana')
          .send({ name: 'new-name', description: 'new', content: 'new', tool_ids: [] })
          .expect(400);
      });

      it('rejects deleting a plugin-managed skill', async () => {
        await supertest
          .delete(`/api/agent_builder/skills/${readonlySkillId}`)
          .set('kbn-xsrf', 'kibana')
          .expect(400);
      });
    });

    describe('plugin name override', () => {
      const overrideName = 'custom-plugin-name';
      const overrideSkillId = `${overrideName}-${SKILL_DIR_NAME}`;

      it('installs with the overridden name', async () => {
        const response = await installFromUrl(
          `${serverUrl}/plugins/${PLUGIN_NAME}.zip`,
          overrideName
        ).expect(200);

        createdPluginIds.push(response.body.id);

        expect(response.body.name).to.be(overrideName);
        expect(response.body.skill_ids).to.contain(overrideSkillId);
      });

      it('creates skills with the overridden plugin name as plugin_id', async () => {
        const skill = await findPluginSkill(overrideSkillId);
        expect(skill).to.be.ok();
        expect(skill!.plugin_id).to.be(overrideName);
      });
    });

    describe('invalid URL', () => {
      it('rejects a URL that is neither a zip nor a GitHub URL', async () => {
        await installFromUrl('https://example.com/not-a-plugin').expect(400);
      });
    });
  });
}
