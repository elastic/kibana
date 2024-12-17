/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SaveProps } from './app';
import { type SaveVisualizationProps, runSaveLensVisualization } from './save_modal_container';
import { defaultDoc, makeDefaultServices } from '../mocks';
import { faker } from '@faker-js/faker';
import { makeAttributeService } from '../mocks/services_mock';

jest.mock('../persistence/saved_objects_utils/check_for_duplicate_title', () => ({
  checkForDuplicateTitle: jest.fn(async () => false),
}));

describe('runSaveLensVisualization', () => {
  // Need to call reset here as makeDefaultServices() reuses some mocks from core
  const resetMocks = () =>
    beforeEach(() => {
      jest.resetAllMocks();
    });

  function getDefaultArgs(
    servicesOverrides: Partial<SaveVisualizationProps> = {},
    { saveToLibrary, ...propsOverrides }: Partial<SaveProps & { saveToLibrary: boolean }> = {}
  ) {
    const redirectToOrigin = jest.fn();
    const redirectTo = jest.fn();
    const onAppLeave = jest.fn();
    const switchDatasource = jest.fn();
    const props: SaveVisualizationProps = {
      ...makeDefaultServices(),
      // start with both the initial input and lastKnownDoc synced
      lastKnownDoc: defaultDoc,
      initialInput: { attributes: defaultDoc, savedObjectId: defaultDoc.savedObjectId },
      redirectToOrigin,
      redirectTo,
      onAppLeave,
      switchDatasource,
      ...servicesOverrides,
    };
    const saveProps: SaveProps = {
      newTitle: faker.lorem.word(),
      newDescription: faker.lorem.sentence(),
      newTags: [faker.lorem.word(), faker.lorem.word()],
      isTitleDuplicateConfirmed: false,
      returnToOrigin: false,
      dashboardId: undefined,
      newCopyOnSave: false,
      ...propsOverrides,
    };
    const options = {
      saveToLibrary: Boolean(saveToLibrary),
    };

    return {
      props,
      saveProps,
      options,
      // convenience shortcuts
      /**
       * This function will be called when a fresh chart is saved
       * and in the modal the user chooses to add the chart into a specific dashboard. Make sure to pass the "dashboardId" prop as well to simulate this scenario.
       * This is used to test indirectly the redirectToDashboard call
       */
      redirectToDashboardFn: props.stateTransfer.navigateToWithEmbeddablePackage,
      /**
       * This function will be called before reloading the editor after saving a a new document/new copy of the document
       */
      cleanupEditor: props.stateTransfer.clearEditorState,
      saveToLibraryFn: props.attributeService.saveToLibrary,
      toasts: props.notifications.toasts,
    };
  }

  describe('from dashboard', () => {
    describe('as by value', () => {
      const defaultByValueDoc = { ...defaultDoc, savedObjectId: undefined };

      describe('Save and return', () => {
        resetMocks();

        // Test the "Save and return" button
        it('should get back to dashboard', async () => {
          const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } =
            getDefaultArgs(
              {
                lastKnownDoc: defaultByValueDoc,
                initialInput: { attributes: defaultByValueDoc },
              },
              { returnToOrigin: true }
            );
          await runSaveLensVisualization(props, saveProps, options);

          // callback called
          expect(props.onAppLeave).toHaveBeenCalled();
          expect(props.redirectToOrigin).toHaveBeenCalled();

          // callback not called
          expect(redirectToDashboardFn).not.toHaveBeenCalled();
          expect(saveToLibraryFn).not.toHaveBeenCalled();
          expect(props.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        });

        it('should get back to dashboard preserving the original panel settings', async () => {
          const { props, saveProps, options } = getDefaultArgs(
            {
              lastKnownDoc: defaultByValueDoc,
              initialInput: {
                attributes: defaultByValueDoc,
                title: 'blah',
                timeRange: { from: 'now-7d', to: 'now' },
              },
            },
            { returnToOrigin: true }
          );
          await runSaveLensVisualization(props, saveProps, options);

          // callback called
          expect(props.onAppLeave).toHaveBeenCalled();
          expect(props.redirectToOrigin).toHaveBeenCalledWith(
            expect.objectContaining({
              state: expect.objectContaining({
                title: 'blah',
                timeRange: { from: 'now-7d', to: 'now' },
              }),
            })
          );
        });
      });

      describe('Save to library', () => {
        resetMocks();

        // Test the "Save to library" flow
        it('should save to library without redirect', async () => {
          const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } =
            getDefaultArgs(
              {
                lastKnownDoc: defaultByValueDoc,
                initialInput: { attributes: defaultByValueDoc },
              },
              {
                saveToLibrary: true,
                // do not get back at dashboard once saved
                returnToOrigin: false,
              }
            );
          await runSaveLensVisualization(props, saveProps, options);

          // callback called
          expect(saveToLibraryFn).toHaveBeenCalled();
          expect(props.notifications.toasts.addSuccess).toHaveBeenCalled();

          // not called
          expect(props.onAppLeave).not.toHaveBeenCalled();
          expect(props.redirectToOrigin).not.toHaveBeenCalled();
          expect(redirectToDashboardFn).not.toHaveBeenCalled();
        });

        it('should save to library and redirect', async () => {
          const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn } =
            getDefaultArgs(
              {
                lastKnownDoc: defaultByValueDoc,
                initialInput: { attributes: defaultByValueDoc },
              },
              {
                saveToLibrary: true,
                // return to dashboard once saved
                returnToOrigin: true,
              }
            );
          await runSaveLensVisualization(props, saveProps, options);

          // callback called
          expect(props.onAppLeave).toHaveBeenCalled();
          expect(props.redirectToOrigin).toHaveBeenCalled();
          expect(saveToLibraryFn).toHaveBeenCalled();

          // not called
          expect(redirectToDashboardFn).not.toHaveBeenCalled();
          expect(props.notifications.toasts.addSuccess).not.toHaveBeenCalled();
        });
      });
    });

    describe('as by reference', () => {
      resetMocks();
      // There are 4 possibilities here:
      // save the current document overwriting the existing one
      it('should overwrite and show a success toast', async () => {
        const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } =
          getDefaultArgs(
            {
              // defaultDoc is by reference
            },
            { newCopyOnSave: false, saveToLibrary: true }
          );
        await runSaveLensVisualization(props, saveProps, options);

        // callback called
        expect(saveToLibraryFn).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          defaultDoc.savedObjectId
        );
        expect(toasts.addSuccess).toHaveBeenCalled();

        // not called
        expect(props.onAppLeave).not.toHaveBeenCalled();
        expect(props.redirectToOrigin).not.toHaveBeenCalled();
        expect(redirectToDashboardFn).not.toHaveBeenCalled();
      });

      // save the current document as a new by-ref copy in the library
      it('should save as a new copy and show a success toast', async () => {
        const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } =
          getDefaultArgs(
            {
              // defaultDoc is by reference
            },
            { newCopyOnSave: true, saveToLibrary: true }
          );
        await runSaveLensVisualization(props, saveProps, options);

        // callback called
        expect(saveToLibraryFn).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          undefined
        );
        expect(toasts.addSuccess).toHaveBeenCalled();

        // not called
        expect(props.onAppLeave).not.toHaveBeenCalled();
        expect(props.redirectToOrigin).not.toHaveBeenCalled();
        expect(redirectToDashboardFn).not.toHaveBeenCalled();
      });
      // save the current document as a new by-value copy and add it to a dashboard
      it('should save as a new by-value copy and redirect to the dashboard', async () => {
        const dashboardId = faker.string.uuid();
        const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } =
          getDefaultArgs(
            {
              // defaultDoc is by reference
            },
            { newCopyOnSave: true, saveToLibrary: false, dashboardId }
          );
        await runSaveLensVisualization(props, saveProps, options);

        // callback called
        expect(props.onAppLeave).toHaveBeenCalled();

        // not called
        expect(props.redirectToOrigin).not.toHaveBeenCalled();
        expect(redirectToDashboardFn).toHaveBeenCalledWith(
          'dashboards',
          // make sure the new savedObject id is removed from the new input
          expect.objectContaining({
            state: expect.objectContaining({
              input: expect.objectContaining({ savedObjectId: undefined }),
            }),
          })
        );
        expect(saveToLibraryFn).not.toHaveBeenCalled();
        expect(toasts.addSuccess).not.toHaveBeenCalled();
      });

      // save the current document as a new by-ref copy and add it to a dashboard
      it('should save as a new by-ref copy and redirect to the dashboard', async () => {
        const dashboardId = faker.string.uuid();
        const { props, saveProps, options, redirectToDashboardFn, saveToLibraryFn, toasts } =
          getDefaultArgs(
            {
              // defaultDoc is by reference
            },
            { newCopyOnSave: true, saveToLibrary: true, dashboardId }
          );
        await runSaveLensVisualization(props, saveProps, options);

        // callback called
        expect(props.onAppLeave).toHaveBeenCalled();
        expect(redirectToDashboardFn).toHaveBeenCalledWith(
          'dashboards',
          // make sure the new savedObject id is passed with the new input
          expect.objectContaining({
            state: expect.objectContaining({
              input: expect.objectContaining({ savedObjectId: '1234' }),
            }),
          })
        );
        expect(saveToLibraryFn).toHaveBeenCalled();

        // not called
        expect(props.redirectToOrigin).not.toHaveBeenCalled();
        expect(toasts.addSuccess).not.toHaveBeenCalled();
      });
    });
  });

  describe('fresh editor start', () => {
    resetMocks();

    it('should reload the editor if it has been saved as new copy', async () => {
      const { props, saveProps, options, saveToLibraryFn, cleanupEditor, toasts } = getDefaultArgs(
        {},
        {
          saveToLibrary: true,
          newCopyOnSave: true,
        }
      );
      const result = await runSaveLensVisualization(props, saveProps, options);

      // callback called
      expect(saveToLibraryFn).toHaveBeenCalled();
      expect(toasts.addSuccess).toHaveBeenCalled();
      expect(cleanupEditor).toHaveBeenCalled();
      expect(props.redirectTo).toHaveBeenCalledWith(defaultDoc.savedObjectId);
      expect(result?.isLinkedToOriginatingApp).toBeFalsy();

      // not called
      expect(props.onAppLeave).not.toHaveBeenCalled();
    });

    it('should show a notification toast and reload as first save of the document', async () => {
      const { props, saveProps, options, saveToLibraryFn, toasts } = getDefaultArgs(
        {
          lastKnownDoc: { ...defaultDoc, savedObjectId: undefined },
          persistedDoc: undefined,
          initialInput: undefined,
        },
        { saveToLibrary: true }
      );
      await runSaveLensVisualization(props, saveProps, options);

      // callback called
      expect(saveToLibraryFn).toHaveBeenCalled();
      expect(toasts.addSuccess).toHaveBeenCalled();
      expect(props.redirectTo).toHaveBeenCalled();

      // not called
      expect(props.application.navigateToApp).not.toHaveBeenCalledWith('lens', { path: '/' });
      expect(props.redirectToOrigin).not.toHaveBeenCalled();
    });

    it('should throw if something goes wrong when saving', async () => {
      const attributeServiceMock = {
        ...makeAttributeService(defaultDoc),
        saveToLibrary: jest.fn().mockImplementation(() => Promise.reject(Error('failed to save'))),
      };
      const { props, saveProps, options, toasts } = getDefaultArgs(
        {
          lastKnownDoc: { ...defaultDoc, savedObjectId: undefined },
          attributeService: attributeServiceMock,
        },
        { saveToLibrary: true }
      );
      try {
        await runSaveLensVisualization(props, saveProps, options);
      } catch (error) {
        expect(toasts.addDanger).toHaveBeenCalled();
        expect(toasts.addSuccess).not.toHaveBeenCalled();
        expect(error.message).toEqual('failed to save');
      }
    });
  });

  // While this is technically a virtual option as for now, it's still worth testing to not break it in the future
  describe('Textbased version', () => {
    resetMocks();

    it('should have a dedicated flow for textbased saving by-ref', async () => {
      // simulate a new save
      const attributeServiceMock = makeAttributeService({
        ...defaultDoc,
        savedObjectId: faker.string.uuid(),
      });

      const { props, saveProps, options, saveToLibraryFn, cleanupEditor } = getDefaultArgs(
        {
          textBasedLanguageSave: true,
          attributeService: attributeServiceMock,
          // give a document without a savedObjectId
          lastKnownDoc: { ...defaultDoc, savedObjectId: undefined },
          persistedDoc: undefined,
          // simulate a fresh start in the editor
          initialInput: undefined,
        },
        {
          saveToLibrary: true,
        }
      );

      await runSaveLensVisualization(props, saveProps, options);

      // callback called
      expect(saveToLibraryFn).toHaveBeenCalled();
      expect(cleanupEditor).toHaveBeenCalled();
      expect(props.switchDatasource).toHaveBeenCalled();
      expect(props.redirectTo).not.toHaveBeenCalled();
      expect(props.application.navigateToApp).toHaveBeenCalledWith('lens', { path: '/' });
    });
  });
});
