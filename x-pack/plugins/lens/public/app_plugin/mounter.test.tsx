/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { makeDefaultServices, mockLensStore, defaultDoc } from '../mocks';
import { createMockDatasource, DatasourceMock } from '../editor_frame_service/mocks';
import { act } from 'react-dom/test-utils';
import { loadDocument } from './mounter';
import { LensEmbeddableInput } from '../editor_frame_service/embeddable/embeddable';

const defaultSavedObjectId = '1234';

describe('Mounter', () => {
  const byValueFlag = { allowByValueEmbeddables: true };
  const mockDatasource: DatasourceMock = createMockDatasource('testDatasource');
  const mockDatasource2: DatasourceMock = createMockDatasource('testDatasource2');
  const datasourceMap = {
    testDatasource2: mockDatasource2,
    testDatasource: mockDatasource,
  };
  const visualizationMap = {};

  describe('loadDocument', () => {
    it('does not load a document if there is no initial input', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      const lensStore = mockLensStore({ data: services.data });
      await loadDocument(
        redirectCallback,
        undefined,
        services,
        lensStore,
        undefined,
        byValueFlag,
        datasourceMap,
        visualizationMap
      );
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);

      const lensStore = await mockLensStore({ data: services.data });
      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });

      expect(services.data.indexPatterns.get).toHaveBeenCalledWith('1');

      expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } } },
      ]);

      expect(lensStore.getState()).toEqual({
        app: expect.objectContaining({
          persistedDoc: { ...defaultDoc, type: 'lens' },
          query: 'kuery',
          isAppLoading: false,
          activeDatasourceId: 'testDatasource',
          persistedId: '1234',
        }),
      });
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const redirectCallback = jest.fn();
      const services = makeDefaultServices();
      const lensStore = mockLensStore({ data: services.data });

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: '5678' } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();

      const lensStore = mockLensStore({ data: services.data });

      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });
      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(redirectCallback).toHaveBeenCalled();
    });

    it('adds to the recently accessed list on load', async () => {
      const redirectCallback = jest.fn();

      const services = makeDefaultServices();
      const lensStore = mockLensStore({ data: services.data });
      await act(async () => {
        await loadDocument(
          redirectCallback,
          ({ savedObjectId: defaultSavedObjectId } as unknown) as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag,
          datasourceMap,
          visualizationMap
        );
      });

      expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
      );
    });
  });
});
