/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService, ElasticAssistantAppContext } from './app_context';
import { loggerMock } from '@kbn/logging-mocks';
import { AssistantTool } from '../types';
import { AssistantFeatures, defaultAssistantFeatures } from '@kbn/elastic-assistant-common';

// Mock Logger
const mockLogger = loggerMock.create();

// Mock ElasticAssistantAppContext
const mockAppContext: ElasticAssistantAppContext = {
  logger: mockLogger,
};

describe('AppContextService', () => {
  const toolOne: AssistantTool = {
    id: 'tool-one',
    name: 'ToolOne',
    description: 'Description 1',
    sourceRegister: 'Source1',
    isSupported: jest.fn(),
    getTool: jest.fn(),
  };
  const toolTwo: AssistantTool = {
    id: 'tool-two',
    name: 'ToolTwo',
    description: 'Description 2',
    sourceRegister: 'Source2',
    isSupported: jest.fn(),
    getTool: jest.fn(),
  };

  beforeEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  describe('starting and stopping', () => {
    it('should clear registered tools when stopped ', () => {
      appContextService.start(mockAppContext);
      appContextService.registerTools('super', [toolOne]);
      appContextService.stop();

      expect(appContextService.getRegisteredTools('super').length).toBe(0);
    });

    it('should return default registered features when stopped ', () => {
      appContextService.start(mockAppContext);
      appContextService.registerFeatures('super', {
        assistantModelEvaluation: true,
      });
      appContextService.stop();

      expect(appContextService.getRegisteredFeatures('super')).toEqual(
        expect.objectContaining(defaultAssistantFeatures)
      );
    });
  });

  describe('registering tools', () => {
    it('should register and get tools for a single plugin', () => {
      const pluginName = 'pluginName';

      appContextService.start(mockAppContext);
      appContextService.registerTools(pluginName, [toolOne, toolTwo]);

      // Check if getRegisteredTools returns the correct tools
      const retrievedTools = appContextService.getRegisteredTools(pluginName);
      expect(retrievedTools).toEqual([toolOne, toolTwo]);
    });

    it('should register and get tools for multiple plugins', () => {
      const pluginOne = 'plugin1';
      const pluginTwo = 'plugin2';

      appContextService.start(mockAppContext);
      appContextService.registerTools(pluginOne, [toolOne]);
      appContextService.registerTools(pluginTwo, [toolTwo]);

      expect(appContextService.getRegisteredTools(pluginOne)).toEqual([toolOne]);
      expect(appContextService.getRegisteredTools(pluginTwo)).toEqual([toolTwo]);
    });

    it('should not add the same tool twice', () => {
      const pluginName = 'pluginName';

      appContextService.start(mockAppContext);
      appContextService.registerTools(pluginName, [toolOne]);
      appContextService.registerTools(pluginName, [toolOne]);

      expect(appContextService.getRegisteredTools(pluginName).length).toEqual(1);
    });
  });

  describe('registering features', () => {
    it('should register and get features for a single plugin', () => {
      const pluginName = 'pluginName';
      const features: AssistantFeatures = {
        ...defaultAssistantFeatures,
        assistantModelEvaluation: true,
      };

      appContextService.start(mockAppContext);
      appContextService.registerFeatures(pluginName, features);

      // Check if getRegisteredFeatures returns the correct tools
      const retrievedFeatures = appContextService.getRegisteredFeatures(pluginName);
      expect(retrievedFeatures).toEqual(features);
    });

    it('should register and get features for multiple plugins', () => {
      const pluginOne = 'plugin1';
      const featuresOne: AssistantFeatures = {
        ...defaultAssistantFeatures,
        assistantModelEvaluation: true,
      };
      const pluginTwo = 'plugin2';
      const featuresTwo: AssistantFeatures = {
        ...defaultAssistantFeatures,
        assistantModelEvaluation: false,
      };

      appContextService.start(mockAppContext);
      appContextService.registerFeatures(pluginOne, featuresOne);
      appContextService.registerFeatures(pluginTwo, featuresTwo);

      expect(appContextService.getRegisteredFeatures(pluginOne)).toEqual(featuresOne);
      expect(appContextService.getRegisteredFeatures(pluginTwo)).toEqual(featuresTwo);
    });

    it('should update features if registered again', () => {
      const pluginName = 'pluginName';
      const featuresOne: AssistantFeatures = {
        ...defaultAssistantFeatures,
        assistantModelEvaluation: true,
      };
      const featuresTwo: AssistantFeatures = {
        ...defaultAssistantFeatures,
        assistantModelEvaluation: false,
      };

      appContextService.start(mockAppContext);
      appContextService.registerFeatures(pluginName, featuresOne);
      appContextService.registerFeatures(pluginName, featuresTwo);

      expect(appContextService.getRegisteredFeatures(pluginName)).toEqual(featuresTwo);
    });

    it('should return default features if pluginName not present', () => {
      appContextService.start(mockAppContext);

      expect(appContextService.getRegisteredFeatures('super')).toEqual(
        expect.objectContaining(defaultAssistantFeatures)
      );
    });

    it('allows registering a subset of all available features', () => {
      const pluginName = 'pluginName';
      const featuresSubset: Partial<AssistantFeatures> = {
        assistantModelEvaluation: true,
      };

      appContextService.start(mockAppContext);
      appContextService.registerFeatures(pluginName, featuresSubset);

      expect(appContextService.getRegisteredFeatures(pluginName)).toEqual(
        expect.objectContaining({ ...defaultAssistantFeatures, ...featuresSubset })
      );
    });
  });
});
