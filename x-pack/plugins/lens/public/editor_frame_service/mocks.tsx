/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PaletteDefinition } from '@kbn/coloring';
import { ExpressionsSetup, ExpressionsStart } from '@kbn/expressions-plugin/public';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { EditorFrameSetupPlugins, EditorFrameStartPlugins } from './service';

export function createMockPaletteDefinition(): jest.Mocked<PaletteDefinition> {
  return {
    getCategoricalColors: jest.fn((_) => ['#ff0000', '#00ff00']),
    title: 'Mock Palette',
    id: 'default',
    toExpression: jest.fn(() => ({
      type: 'expression',
      chain: [
        {
          type: 'function',
          function: 'mock_palette',
          arguments: {},
        },
      ],
    })),
    getCategoricalColor: jest.fn().mockReturnValue('#ff0000'),
  };
}

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

export type MockedSetupDependencies = Omit<EditorFrameSetupPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsSetup>;
};

export type MockedStartDependencies = Omit<EditorFrameStartPlugins, 'expressions'> & {
  expressions: jest.Mocked<ExpressionsStart>;
};

export function createMockSetupDependencies() {
  return {
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createSetupContract(),
    expressions: expressionsPluginMock.createSetupContract(),
    charts: chartPluginMock.createSetupContract(),
  } as unknown as MockedSetupDependencies;
}

export function createMockStartDependencies() {
  return {
    data: dataPluginMock.createSetupContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    expressions: expressionsPluginMock.createStartContract(),
    charts: chartPluginMock.createStartContract(),
  } as unknown as MockedStartDependencies;
}
