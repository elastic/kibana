/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { makeDefaultServices, mockLensStore } from '../mocks';
import { act } from 'react-dom/test-utils';
import { loadDocument } from './mounter';
import { LensEmbeddableInput } from '../editor_frame_service/embeddable/embeddable';

const defaultSavedObjectId = '1234';

describe('Mounter', () => {
  const byValueFlag = { allowByValueEmbeddables: true };
  describe('loadDocument', () => {
    it('does not load a document if there is no initial input', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      const lensStore = mockLensStore({ data: services.data });
      await loadDocument(redirectCallback, undefined, services, lensStore, undefined, byValueFlag);
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const services = makeDefaultServices();
      const redirectCallback = jest.fn();
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        savedObjectId: defaultSavedObjectId,
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      });

      const lensStore = await mockLensStore({ data: services.data });
      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag
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
          persistedDoc: expect.objectContaining({
            savedObjectId: defaultSavedObjectId,
            state: expect.objectContaining({
              query: 'fake query',
              filters: [{ query: { match_phrase: { src: 'test' } } }],
            }),
          }),
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
          byValueFlag
        );
      });

      await act(async () => {
        await loadDocument(
          redirectCallback,
          { savedObjectId: defaultSavedObjectId } as LensEmbeddableInput,
          services,
          lensStore,
          undefined,
          byValueFlag
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
          byValueFlag
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
          byValueFlag
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
          byValueFlag
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
