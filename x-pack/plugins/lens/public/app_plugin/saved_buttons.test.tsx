/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { PropsWithChildren } from 'react';
import { Observable, Subject } from 'rxjs';
import { screen } from '@testing-library/react';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App } from './app';
import { LensAppProps, LensAppServices } from './types';
import { EditorFrameInstance, EditorFrameProps } from '../types';
import { Document, SavedObjectIndexStore } from '../persistence';
import {
  visualizationMap,
  datasourceMap,
  makeDefaultServices,
  mountWithProvider,
  mockStoreDeps,
  renderWithReduxStore,
} from '../mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { SavedObjectSaveModal } from '@kbn/saved-objects-plugin/public';
import { checkForDuplicateTitle } from '../persistence';
import { createMemoryHistory } from 'history';
import { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildExistsFilter, FilterStateStore } from '@kbn/es-query';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import { LensByValueInput } from '../embeddable/embeddable';
import { SavedObjectReference } from '@kbn/core/types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { setState, LensAppState } from '../state_management';
import { coreMock } from '@kbn/core/public/mocks';
import userEvent from '@testing-library/user-event';
jest.mock('../editor_frame_service/editor_frame/expression_helpers');
jest.mock('@kbn/core/public');
jest.mock('../persistence/saved_objects_utils/check_for_duplicate_title', () => ({
  checkForDuplicateTitle: jest.fn(),
}));

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

// jest.mock('./save_modal', () => {
//   const original = jest.requireActual('./save_modal');

//   return {
//     ...original,
//     SaveModal: (props) => <div></div>,
//   };
// });

const sessionIdSubject = new Subject<string>();

describe('Save buttons', () => {
  let defaultDoc: Document;
  let defaultSavedObjectId: string;

  function createMockFrame(): jest.Mocked<EditorFrameInstance> {
    return {
      EditorFrameContainer: jest.fn((props: EditorFrameProps) => <div />),
      datasourceMap,
      visualizationMap,
    };
  }

  const navMenuItems = {
    expectedSaveButton: { emphasize: true, testId: 'lnsApp_saveButton' },
    expectedSaveAsButton: { emphasize: false, testId: 'lnsApp_saveButton' },
    expectedSaveAndReturnButton: { emphasize: true, testId: 'lnsApp_saveAndReturnButton' },
  };

  function makeDefaultProps(): jest.Mocked<LensAppProps> {
    return {
      editorFrame: createMockFrame(),
      history: createMemoryHistory(),
      redirectTo: jest.fn(),
      redirectToOrigin: jest.fn(),
      onAppLeave: jest.fn(),
      setHeaderActionMenu: jest.fn(),
      datasourceMap,
      visualizationMap,
      topNavMenuEntryGenerators: [],
      theme$: new Observable(),
      coreStart: coreMock.createStart(),
      savedObjectStore: {
        save: jest.fn(),
        load: jest.fn(),
        search: jest.fn(),
      } as unknown as SavedObjectIndexStore,
    };
  }

  const makeDefaultServicesForApp = () => makeDefaultServices(sessionIdSubject, 'sessionId-1');

  async function mountWith({
    props = makeDefaultProps(),
    services = makeDefaultServicesForApp(),
    preloadedState,
  }: {
    props?: jest.Mocked<LensAppProps>;
    services?: jest.Mocked<LensAppServices>;
    preloadedState?: Partial<LensAppState>;
  }) {
    const wrappingComponent: React.FC<PropsWithChildren<{}>> = ({ children }) => {
      return (
        <I18nProvider>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </I18nProvider>
      );
    };
    const storeDeps = mockStoreDeps({ lensServices: services });
    const { instance, lensStore } = await mountWithProvider(
      <App {...props} />,
      {
        storeDeps,
        preloadedState,
      },
      { wrappingComponent }
    );

    const frame = props.editorFrame as ReturnType<typeof createMockFrame>;
    lensStore.dispatch(setState({ ...preloadedState }));
    return { instance, frame, props, services, lensStore };
  }

  beforeEach(() => {
    defaultSavedObjectId = '1234';
    defaultDoc = {
      savedObjectId: defaultSavedObjectId,
      visualizationType: 'testVis',
      type: 'lens',
      title: 'An extremely cool default document!',
      expression: 'definitely a valid expression',
      state: {
        query: 'lucene',
        filters: [{ query: { match_phrase: { src: 'test' } }, meta: { index: 'index-pattern-0' } }],
      },
      references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
    } as unknown as Document;
  });

  interface SaveProps {
    newCopyOnSave: boolean;
    returnToOrigin?: boolean;
    newTitle: string;
  }

  function getSaveButton(inst: ReactWrapper): TopNavMenuData {
    return (inst.find('[data-test-subj="lnsApp_topNav"]').prop('config') as TopNavMenuData[]).find(
      (button) => button.testId === 'lnsApp_saveButton'
    )!;
  }

  function getSaveAndReturnButton(inst: ReactWrapper): TopNavMenuData {
    return (inst.find('[data-test-subj="lnsApp_topNav"]').prop('config') as TopNavMenuData[]).find(
      (button) => button.testId === 'lnsApp_saveAndReturnButton'
    )!;
  }

  async function testSave(inst: ReactWrapper, saveProps: SaveProps) {
    getSaveButton(inst).run(inst.getDOMNode());
    // wait a tick since SaveModalContainer initializes asynchronously
    await new Promise(process.nextTick);
    const handler = inst.update().find('SavedObjectSaveModalOrigin').prop('onSave') as (
      p: unknown
    ) => void;
    handler(saveProps);
  }

  async function save({
    preloadedState,
    initialSavedObjectId,
    ...saveProps
  }: SaveProps & {
    preloadedState?: Partial<LensAppState>;
    initialSavedObjectId?: string;
  }) {
    const props = {
      ...makeDefaultProps(),
      initialInput: initialSavedObjectId
        ? { savedObjectId: initialSavedObjectId, id: '5678' }
        : undefined,
    };

    const services = makeDefaultServicesForApp();
    services.attributeService.wrapAttributes = jest
      .fn()
      .mockImplementation(async ({ savedObjectId }) => ({
        savedObjectId: savedObjectId || 'aaa',
      }));
    services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
      metaInfo: {
        sharingSavedObjectProps: {
          outcome: 'exactMatch',
        },
      },
      attributes: {
        savedObjectId: initialSavedObjectId ?? 'aaa',
        references: [],
        state: {
          query: 'fake query',
          filters: [],
        },
      },
    } as jest.ResolvedValue<Document>);

    const { frame, instance, lensStore } = await mountWith({
      services,
      props,
      preloadedState: {
        isSaveable: true,
        ...preloadedState,
      },
    });
    expect(getSaveButton(instance).disableButton).toEqual(false);
    await act(async () => {
      testSave(instance, { ...saveProps });
    });
    return { props, services, instance, frame, lensStore };
  }

  describe('rtl', () => {
    const renderApp = async (args?: {
      overrideServices?: Partial<LensAppServices>;
      props?: Partial<LensAppProps>;
      preloadedState?: Partial<LensAppState>;
    }) => {
      const { overrideServices, props, preloadedState } = args || {};
      const services = {
        ...makeDefaultServicesForApp(),
        ...overrideServices,
      };
      const wrappingComponent: React.FC<PropsWithChildren<{}>> = ({ children }) => {
        return (
          <I18nProvider>
            <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
          </I18nProvider>
        );
      };
      const enhancedRender = renderWithReduxStore(
        <App {...makeDefaultProps()} {...props} />,
        { wrapper: wrappingComponent },
        { preloadedState, storeDeps: mockStoreDeps({ lensServices: services }) }
      );
      await act(() => Promise.resolve());
      return {
        ...enhancedRender,
        querySaveButton: () => screen.queryByTestId('lnsApp_saveButton'),
        querySaveAndReturnButton: () => screen.queryByTestId('lnsApp_saveAndReturnButton'),
      };
    };
    it('shows a disabled save button when the user does not have permissions', async () => {
      const overrideServices = makeDefaultServicesForApp();
      overrideServices.application.capabilities = {
        ...overrideServices.application.capabilities,
        visualize: { save: false, saveQuery: false, show: true },
      };
      const { store, querySaveButton } = await renderApp({ overrideServices });
      expect(querySaveButton()).toBeDisabled();
      act(() => {
        store.dispatch(setState({ isSaveable: true }));
      });
      expect(querySaveButton()).toBeDisabled();
    });
    it('shows a save button that is enabled when the frame has provided its state and does not show save and return or save as', async () => {
      const { store, querySaveButton, querySaveAndReturnButton } = await renderApp();
      expect(querySaveButton()).toBeDisabled();
      act(() => {
        store.dispatch(setState({ isSaveable: true }));
      });
      expect(querySaveButton()).not.toBeDisabled();
      expect(querySaveAndReturnButton()).toBeFalsy();
    });

    it('Shows Save and Return button in create by value mode with originating app', async () => {
      const incomingState = {
        originatingApp: 'ultraDashboard',
        valueInput: {
          id: 'whatchaGonnaDoWith',
          attributes: {
            title:
              'whatcha gonna do with all these references? All these references in your value Input',
            references: [] as SavedObjectReference[],
          },
        } as LensByValueInput,
      };
      const { querySaveAndReturnButton } = await renderApp({
        props: { incomingState },
        preloadedState: {
          isLinkedToOriginatingApp: true,
        },
      });
      expect(querySaveAndReturnButton).toBeTruthy();
    });

    it('Shows Save and Return button in edit by reference mode', async () => {
      const initialInput = { savedObjectId: defaultSavedObjectId, id: '5678' };
      const incomingState = {
        originatingApp: 'ultraDashboard',
      };

      const { querySaveAndReturnButton } = await renderApp({
        props: { incomingState, initialInput },
        preloadedState: {
          isLinkedToOriginatingApp: true,
        },
      });

      expect(querySaveAndReturnButton).toBeTruthy();
    });
    it('enables Save Query UI when user has app-level permissions', async () => {
      const services = makeDefaultServicesForApp();
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize: { saveQuery: true },
      };
      await renderApp({ overrideServices: services });
      expect(screen.queryByTestId('saveQueryMenuVisibility')).toHaveTextContent(
        'allowed_by_app_privilege'
      );
    });

    it('checks global save query permission when user does not have app-level permissions', async () => {
      const services = makeDefaultServicesForApp();
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize: { saveQuery: false },
      };
      await renderApp({ overrideServices: services });
      expect(screen.queryByTestId('saveQueryMenuVisibility')).toHaveTextContent('globally_managed');
    });

    it('saves new docs', async () => {
      // initialSavedObjectId: undefined,
      // newCopyOnSave: false,
      // newTitle: 'hello there',

      const services = makeDefaultServicesForApp();
      services.attributeService.wrapAttributes = jest
        .fn()
        .mockImplementation(async ({ savedObjectId }) => ({
          savedObjectId: savedObjectId || 'newId',
        }));
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        metaInfo: {
          sharingSavedObjectProps: {
            outcome: 'exactMatch',
          },
        },
        attributes: {
          savedObjectId: 'newId',
          references: [],
          state: {
            query: 'fake query',
            filters: [],
          },
        },
      } as jest.ResolvedValue<Document>);
      const redirectTo = jest.fn();
      const { querySaveButton } = await renderApp({
        props: { redirectTo },
        overrideServices: services,
        preloadedState: { isSaveable: true },
      });
      screen.debug();
      userEvent.click(querySaveButton());
      await act(() => Promise.resolve());

      expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          savedObjectId: undefined,
        }),
        false,
        undefined
      );
      expect(redirectTo).toHaveBeenCalledWith({
        input: { savedObjectId: 'newId' },
        isCopied: false,
      });
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith("Saved 'hello there'");
    });

    it('saves new docs and comes back to dashboard', async () => {
      // initialSavedObjectId: undefined,
      // newCopyOnSave: false,
      // newTitle: 'hello there',

      const props = {
        ...makeDefaultProps(),
        incomingState: {
          originatingApp: 'ultraDashboard',
        },
        initialInput: undefined,
      };

      const services = makeDefaultServicesForApp();
      services.attributeService.wrapAttributes = jest
        .fn()
        .mockImplementation(async ({ savedObjectId }) => ({
          savedObjectId: savedObjectId || 'newId',
        }));
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        metaInfo: {
          sharingSavedObjectProps: {
            outcome: 'exactMatch',
          },
        },
        attributes: {
          savedObjectId: 'newId',
          references: [],
          state: {
            query: 'fake query',
            filters: [],
          },
        },
      } as jest.ResolvedValue<Document>);
      const { querySaveAndReturnButton } = await renderApp({
        props,
        overrideServices: services,
        preloadedState: { isSaveable: true, isLinkedToOriginatingApp: true },
      });
      screen.debug();
      userEvent.click(querySaveAndReturnButton());
      await act(() => Promise.resolve());

      expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          savedObjectId: undefined,
        }),
        false,
        undefined
      );
      expect(props.redirectToOrigin).toHaveBeenCalledWith({
        input: { savedObjectId: 'newId' },
        isCopied: false,
      });
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith("Saved 'hello there'");
    });
  });

  it.only('saves new docs', async () => {
    const { props, services } = await save({
      initialSavedObjectId: undefined,
      newCopyOnSave: false,
      newTitle: 'hello there',
    });
    expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectId: undefined,
        title: 'hello there',
      }),
      true,
      undefined
    );
    expect(props.redirectTo).toHaveBeenCalledWith('aaa');
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith("Saved 'hello there'");
  });

  it('applies all changes on-save', async () => {
    const { lensStore } = await save({
      initialSavedObjectId: undefined,
      newCopyOnSave: false,
      newTitle: 'hello there',
      preloadedState: {
        applyChangesCounter: 0,
      },
    });
    expect(lensStore.getState().lens.applyChangesCounter).toBe(1);
  });

  it('adds to the recently accessed list on save', async () => {
    const { services } = await save({
      initialSavedObjectId: undefined,
      newCopyOnSave: false,
      newTitle: 'hello there',
    });
    expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
      '/app/lens#/edit/aaa',
      'hello there',
      'aaa'
    );
  });

  it('saves the latest doc as a copy', async () => {
    const { props, services, instance } = await save({
      initialSavedObjectId: defaultSavedObjectId,
      newCopyOnSave: true,
      newTitle: 'hello there',
      preloadedState: { persistedDoc: defaultDoc },
    });
    expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'hello there',
      }),
      true,
      undefined
    );
    expect(props.redirectTo).toHaveBeenCalledWith(defaultSavedObjectId);
    await act(async () => {
      instance.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
    });
    expect(services.attributeService.wrapAttributes).toHaveBeenCalledTimes(1);
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith("Saved 'hello there'");
  });

  it('saves existing docs', async () => {
    const { props, services, instance } = await save({
      initialSavedObjectId: defaultSavedObjectId,
      newCopyOnSave: false,
      newTitle: 'hello there',
      preloadedState: { persistedDoc: defaultDoc },
    });
    expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectId: defaultSavedObjectId,
        title: 'hello there',
      }),
      true,
      { id: '5678', savedObjectId: defaultSavedObjectId }
    );
    expect(props.redirectTo).not.toHaveBeenCalled();
    await act(async () => {
      instance.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
    });
    expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith("Saved 'hello there'");
  });

  it('handles save failure by showing a warning, but still allows another save', async () => {
    const mockedConsoleDir = jest.spyOn(console, 'dir'); // mocked console.dir to avoid messages in the console when running tests
    mockedConsoleDir.mockImplementation(() => {});

    const props = makeDefaultProps();

    props.incomingState = {
      originatingApp: 'ultraDashboard',
    };

    const services = makeDefaultServicesForApp();
    services.attributeService.wrapAttributes = jest.fn().mockRejectedValue({ message: 'failed' });
    const { instance } = await mountWith({
      props,
      services,
      preloadedState: {
        isSaveable: true,
        isLinkedToOriginatingApp: true,
      },
    });

    await act(async () => {
      testSave(instance, { newCopyOnSave: false, newTitle: 'hello there' });
    });
    expect(props.redirectTo).not.toHaveBeenCalled();
    expect(getSaveButton(instance).disableButton).toEqual(false);
    // eslint-disable-next-line no-console
    expect(console.dir).toHaveBeenCalledTimes(1);
    mockedConsoleDir.mockRestore();
  });

  it('saves new doc and redirects to originating app', async () => {
    const { props, services } = await save({
      initialSavedObjectId: undefined,
      returnToOrigin: true,
      newCopyOnSave: false,
      newTitle: 'hello there',
    });
    expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectId: undefined,
        title: 'hello there',
      }),
      true,
      undefined
    );
    expect(props.redirectToOrigin).toHaveBeenCalledWith({
      input: { savedObjectId: 'aaa' },
      isCopied: false,
    });
  });

  it('saves app filters and does not save pinned filters', async () => {
    const indexPattern = { id: 'index1', isPersisted: () => true } as unknown as DataView;
    const field = { name: 'myfield' } as unknown as FieldSpec;
    const pinnedField = { name: 'pinnedField' } as unknown as FieldSpec;
    const unpinned = buildExistsFilter(field, indexPattern);
    const pinned = buildExistsFilter(pinnedField, indexPattern);
    await act(async () => {
      FilterManager.setFiltersStore([pinned], FilterStateStore.GLOBAL_STATE);
    });
    const { services } = await save({
      initialSavedObjectId: defaultSavedObjectId,
      newCopyOnSave: false,
      newTitle: 'hello there2',
      preloadedState: {
        persistedDoc: defaultDoc,
        filters: [pinned, unpinned],
      },
    });

    const { state: expectedFilters } = services.data.query.filterManager.extract([unpinned]);

    expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
      expect.objectContaining({
        savedObjectId: defaultSavedObjectId,
        title: 'hello there2',
        state: expect.objectContaining({ filters: expectedFilters }),
      }),
      true,
      { id: '5678', savedObjectId: defaultSavedObjectId }
    );
  });
});
