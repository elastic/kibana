/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import type { LensPluginStartDependencies } from '../../plugin';
import type { Datasource, Visualization } from '../../types';
import type { EditorFrameService } from '../../editor_frame_service';
import { createMockStartDependencies } from '../../editor_frame_service/mocks';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { CreateESQLPanelAction } from './create_action';

describe('create Lens panel action', () => {
  const core = coreMock.createStart();
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  const mockPresentationContainer = getMockPresentationContainer();

  const mockEditorFrameService = {
    loadVisualizations: jest.fn(),
    loadDatasources: jest.fn(),
  } as unknown as EditorFrameService;

  const mockGetEditorFrameService = jest.fn(() => Promise.resolve(mockEditorFrameService));

  describe('compatibility check', () => {
    it('is incompatible if ui setting for ES|QL is off', async () => {
      const configurablePanelAction = new CreateESQLPanelAction(
        mockStartDependencies,
        core,
        mockGetEditorFrameService
      );
      const isCompatible = await configurablePanelAction.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is incompatible if ui setting for ES|QL is enabled, without dataSourceMap and visualizationMap', async () => {
      const updatedCore = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'enableESQL';
          },
        },
      } as CoreStart;

      const createESQLAction = new CreateESQLPanelAction(
        mockStartDependencies,
        updatedCore,
        mockGetEditorFrameService
      );

      const isCompatible = await createESQLAction.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible if ui setting for ES|QL is enabled and dataSourceMap, alongside visualizationMap exist', async () => {
      const updatedCore = {
        ...core,
        uiSettings: {
          ...core.uiSettings,
          get: (setting: string) => {
            return setting === 'enableESQL';
          },
        },
      } as CoreStart;

      const createESQLAction = new CreateESQLPanelAction(
        mockStartDependencies,
        updatedCore,
        mockGetEditorFrameService
      );

      jest
        .spyOn(mockEditorFrameService, 'loadVisualizations')
        .mockResolvedValue({} as Record<string, Visualization>);
      jest
        .spyOn(mockEditorFrameService, 'loadDatasources')
        .mockResolvedValue({} as Record<string, Datasource>);

      const isCompatible = await createESQLAction.isCompatible({
        embeddable: mockPresentationContainer,
      });

      expect(isCompatible).toBeTruthy();
    });
  });
});
