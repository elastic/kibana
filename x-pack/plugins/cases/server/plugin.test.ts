/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/server';
import {} from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { createFilesSetupMock } from '@kbn/files-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { notificationsMock } from '@kbn/notifications-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { CasePlugin } from './plugin';
import type { ConfigType } from './config';
import { ALLOWED_MIME_TYPES } from '../common/constants/mime_types';
import type { CasesServerSetupDependencies, CasesServerStartDependencies } from './types';

function getConfig(overrides = {}) {
  return {
    markdownPlugins: { lens: true },
    files: { maxSize: 1, allowedMimeTypes: ALLOWED_MIME_TYPES },
    stack: { enabled: true },
    ...overrides,
  };
}

describe('Cases Plugin', () => {
  let context: PluginInitializerContext;
  let plugin: CasePlugin;
  let coreSetup: ReturnType<typeof coreMock.createSetup>;
  let coreStart: ReturnType<typeof coreMock.createStart>;
  let pluginsSetup: jest.Mocked<CasesServerSetupDependencies>;
  let pluginsStart: jest.Mocked<CasesServerStartDependencies>;

  beforeEach(() => {
    context = coreMock.createPluginInitializerContext<ConfigType>(getConfig());

    plugin = new CasePlugin(context);
    coreSetup = coreMock.createSetup();
    coreStart = coreMock.createStart();

    pluginsSetup = {
      alerting: alertsMock.createSetup(),
      taskManager: taskManagerMock.createSetup(),
      actions: actionsMock.createSetup(),
      files: createFilesSetupMock(),
      lens: {
        lensEmbeddableFactory: makeLensEmbeddableFactory(
          () => ({}),
          () => ({}),
          {}
        ),
        registerVisualizationMigration: jest.fn(),
      },
      security: securityMock.createSetup(),
      licensing: licensingMock.createSetup(),
      usageCollection: usageCollectionPluginMock.createSetupContract(),
      features: featuresPluginMock.createSetup(),
    };

    pluginsStart = {
      licensing: licensingMock.createStart(),
      actions: actionsMock.createStart(),
      files: { fileServiceFactory: { asScoped: jest.fn(), asInternal: jest.fn() } },
      features: featuresPluginMock.createStart(),
      security: securityMock.createStart(),
      notifications: notificationsMock.createStart(),
      ruleRegistry: { getRacClientWithRequest: jest.fn(), alerting: alertsMock.createStart() },
    };
  });

  describe('setup()', () => {
    it('should start setup cases plugin correctly', async () => {
      plugin.setup(coreSetup, pluginsSetup);

      expect(context.logger.get().debug).toHaveBeenCalledWith(
        `Setting up Case Workflow with core contract [${Object.keys(
          coreSetup
        )}] and plugins [${Object.keys(pluginsSetup)}]`
      );
    });

    it('should register kibana feature when stack is enabled', async () => {
      plugin.setup(coreSetup, pluginsSetup);

      expect(pluginsSetup.features.registerKibanaFeature).toHaveBeenCalled();
    });

    it('should not register kibana feature when stack is disabled', async () => {
      context = coreMock.createPluginInitializerContext<ConfigType>(
        getConfig({ stack: { enabled: false } })
      );
      const pluginWithStackDisabled = new CasePlugin(context);

      pluginWithStackDisabled.setup(coreSetup, pluginsSetup);

      expect(pluginsSetup.features.registerKibanaFeature).not.toHaveBeenCalled();
    });
  });

  describe('start', () => {
    it('should start cases plugin correctly', async () => {
      const pluginStart = plugin.start(coreStart, pluginsStart);

      expect(context.logger.get().debug).toHaveBeenCalledWith(`Starting Case Workflow`);

      expect(pluginStart).toMatchInlineSnapshot(`
        Object {
          "getCasesClientWithRequest": [Function],
          "getExternalReferenceAttachmentTypeRegistry": [Function],
          "getPersistableStateAttachmentTypeRegistry": [Function],
        }
      `);
    });
  });
});
