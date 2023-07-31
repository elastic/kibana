/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { schema, ByteSizeValue } from '@kbn/config-schema';
import { PluginInitializerContext, RequestHandlerContext } from '@kbn/core/server';
import { coreMock, httpServerMock } from '@kbn/core/server/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { featuresPluginMock } from '@kbn/features-plugin/server/mocks';
import { createFileServiceMock, createFilesSetupMock } from '@kbn/files-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { makeLensEmbeddableFactory } from '@kbn/lens-plugin/server/embeddable/make_lens_embeddable_factory';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { actionsMock, actionsClientMock } from '@kbn/actions-plugin/server/mocks';
import { notificationsMock } from '@kbn/notifications-plugin/server/mocks';
import { ruleRegistryMocks } from '@kbn/rule-registry-plugin/server/mocks';
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { eventLogMock } from '@kbn/event-log-plugin/server/mocks';
import { CasePlugin, PluginsSetup, PluginsStart } from './plugin';
import type { ConfigType } from './config';
import { ALLOWED_MIME_TYPES } from '../common/constants/mime_types';

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
  let pluginsSetup: jest.Mocked<PluginsSetup>;
  let pluginsStart: jest.Mocked<PluginsStart>;

  describe('setup()', () => {
    beforeEach(() => {
      context = coreMock.createPluginInitializerContext<ConfigType>({
       markdownPlugins: { lens: true },
       files: {maxSize: 10, allowedMimeTypes: ALLOWED_MIME_TYPES },
       stack: { enabled: true}
      });

      plugin = new CasePlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();

      pluginsSetup = {
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
      coreSetup.getStartServices.mockResolvedValue([
        coreMock.createStart(),
        {
          ...pluginsSetup,
          // encryptedSavedObjects: encryptedSavedObjectsMock.createStart(),
        },
        {},
      ]);
    });

    it('should setup cases plugin correctly', async () => {
      plugin.setup(coreSetup, pluginsSetup);

      expect(context.logger.get().debug).toHaveBeenCalledWith(
        `Setting up Case Workflow with core contract [${Object.keys(
          coreSetup
        )}] and plugins [${Object.keys(pluginsSetup)}]`
      );
    });
  });

  describe('start', () => {
    beforeEach(() => {
      context = coreMock.createPluginInitializerContext<ConfigType>({
       markdownPlugins: { lens: true },
       files: {maxSize: 10, allowedMimeTypes: ALLOWED_MIME_TYPES },
       stack: { enabled: true}
      });

      plugin = new CasePlugin(context);
      coreSetup = coreMock.createSetup();
      coreStart = coreMock.createStart();

      pluginsSetup = {
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
        // taskManager: taskManagerMock.createStart(),
        actions: actionsMock.createStart(),
        files: {fileServiceFactory: {asScoped: jest.fn(), asInternal: jest.fn()}},
        features: featuresPluginMock.createStart(),
        security: securityMock.createStart(),
        notifications: notificationsMock.createStart(),
        ruleRegistry: {getRacClientWithRequest: jest.fn(), alerting: alertsMock.createStart()}
      };
    });

    it('should not register kibana feature when stack is disabled', async () => {
      plugin.start(coreStart, pluginsStart);

      expect(context.logger.get().debug).toHaveBeenCalledWith(
        `Starting Case Workflow`
      );
    });
  });
});
