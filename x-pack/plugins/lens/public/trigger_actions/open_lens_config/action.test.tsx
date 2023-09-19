/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import { overlayServiceMock } from '@kbn/core-overlays-browser-mocks';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import type { LensPluginStartDependencies } from '../../plugin';
import { createMockStartDependencies } from '../../editor_frame_service/mocks';
import { DOC_TYPE } from '../../../common/constants';
import { ConfigureInLensPanelAction } from './action';

describe('open config panel action', () => {
  const overlays = overlayServiceMock.createStartContract();
  const theme = themeServiceMock.createStartContract();
  const mockStartDependencies =
    createMockStartDependencies() as unknown as LensPluginStartDependencies;
  describe('compatibility check', () => {
    it('is incompatible with non-lens embeddables', async () => {
      const embeddable = {
        type: 'NOT_LENS',
        isTextBasedLanguage: () => true,
        getInput: () => {
          return {
            viewMode: 'edit',
          };
        },
      } as unknown as IEmbeddable;
      const configurablePanelAction = new ConfigureInLensPanelAction(
        mockStartDependencies,
        overlays,
        theme
      );

      const isCompatible = await configurablePanelAction.isCompatible({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(isCompatible).toBeFalsy();
    });

    it('is incompatible with input view mode', async () => {
      const embeddable = {
        type: 'NOT_LENS',
        getInput: () => {
          return {
            viewMode: 'view',
          };
        },
      } as unknown as IEmbeddable;
      const configurablePanelAction = new ConfigureInLensPanelAction(
        mockStartDependencies,
        overlays,
        theme
      );

      const isCompatible = await configurablePanelAction.isCompatible({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(isCompatible).toBeFalsy();
    });

    it('is compatible with text based language embeddable', async () => {
      const embeddable = {
        type: DOC_TYPE,
        isTextBasedLanguage: () => true,
        getInput: () => {
          return {
            viewMode: 'edit',
          };
        },
        getIsEditable: () => true,
      } as unknown as IEmbeddable;
      const configurablePanelAction = new ConfigureInLensPanelAction(
        mockStartDependencies,
        overlays,
        theme
      );

      const isCompatible = await configurablePanelAction.isCompatible({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(isCompatible).toBeTruthy();
    });
  });
  describe('execution', () => {
    it('opens flyout when executed', async () => {
      const embeddable = {
        type: DOC_TYPE,
        isTextBasedLanguage: () => true,
        getInput: () => {
          return {
            viewMode: 'edit',
          };
        },
        getIsEditable: () => true,
        openConfingPanel: jest.fn().mockResolvedValue(<span>Lens Config Panel Component</span>),
        getRoot: () => {
          return {
            openOverlay: jest.fn(),
            clearOverlays: jest.fn(),
          };
        },
      } as unknown as IEmbeddable;
      const configurablePanelAction = new ConfigureInLensPanelAction(
        mockStartDependencies,
        overlays,
        theme
      );
      const spy = jest.spyOn(overlays, 'openFlyout');

      await configurablePanelAction.execute({
        embeddable,
      } as ActionExecutionContext<{ embeddable: IEmbeddable }>);

      expect(spy).toHaveBeenCalled();
    });
  });
});
