/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Observable, Subject } from 'rxjs';
import { act } from 'react-dom/test-utils';
import { App } from './app';
import { LensAppProps, LensAppServices } from './types';
import { LensDocument, SavedObjectIndexStore } from '../persistence';
import {
  visualizationMap,
  datasourceMap,
  makeDefaultServices,
  renderWithReduxStore,
  mockStoreDeps,
  defaultDoc,
} from '../mocks';
import { checkForDuplicateTitle } from '../persistence';
import { createMemoryHistory } from 'history';
import type { Query } from '@kbn/es-query';
import { FilterManager } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildExistsFilter, FilterStateStore } from '@kbn/es-query';
import type { FieldSpec } from '@kbn/data-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { serverlessMock } from '@kbn/serverless/public/mocks';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import { setState, LensAppState } from '../state_management';
import { coreMock } from '@kbn/core/public/mocks';
import { LensSerializedState } from '..';
import { createMockedField, createMockedIndexPattern } from '../datasources/form_based/mocks';
import { faker } from '@faker-js/faker';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VisualizeEditorContext } from '../types';
import { setMockedPresentationUtilServices } from '@kbn/presentation-util-plugin/public/mocks';

jest.mock('../persistence/saved_objects_utils/check_for_duplicate_title', () => ({
  checkForDuplicateTitle: jest.fn(),
}));
jest.mock('lodash', () => ({
  ...jest.requireActual('lodash'),
  debounce: (fn: unknown) => fn,
}));

const defaultSavedObjectId: string = faker.string.uuid();

const waitToLoad = async () =>
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

function getLensDocumentMock(propsOverrides?: Partial<LensDocument>) {
  return cloneDeep({ ...defaultDoc, ...propsOverrides });
}

describe('Lens App', () => {
  let props: jest.Mocked<LensAppProps>;
  let services: jest.Mocked<LensAppServices> = makeDefaultServices(
    new Subject<string>(),
    'sessionId-1'
  );
  beforeAll(() => setMockedPresentationUtilServices());

  beforeEach(() => {
    props = {
      editorFrame: {
        EditorFrameContainer: jest.fn((_) => <div>Editor frame</div>),
        datasourceMap,
        visualizationMap,
      },
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

    services = makeDefaultServices(new Subject<string>(), 'sessionId-1');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  async function renderApp({
    preloadedState,
  }: {
    preloadedState?: Partial<LensAppState>;
  } = {}) {
    const Wrapper = ({ children }: { children: React.ReactNode }) => (
      <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
    );

    const {
      store,
      render: renderRtl,
      rerender,
      ...rest
    } = renderWithReduxStore(
      <App {...props} />,
      { wrapper: Wrapper },
      {
        storeDeps: mockStoreDeps({ lensServices: services }),
        preloadedState,
      }
    );

    const rerenderWithProps = (newProps: Partial<LensAppProps>) => {
      rerender(<App {...props} {...newProps} />, {
        wrapper: Wrapper,
      });
    };

    await act(async () => await store.dispatch(setState({ ...preloadedState })));
    return { props, lensStore: store, rerender: rerenderWithProps, ...rest };
  }

  it('renders the editor frame', async () => {
    await renderApp();
    expect(screen.getByText('Editor frame')).toBeInTheDocument();
  });

  it('updates global filters with store state', async () => {
    const pinnedField = createMockedField({ name: 'pinnedField', type: '' });
    const indexPattern = createMockedIndexPattern({ id: 'index1' }, [pinnedField]);
    const pinnedFilter = buildExistsFilter(pinnedField, indexPattern);
    services.data.query.filterManager.getFilters = jest.fn().mockReturnValue([]);
    services.data.query.filterManager.getGlobalFilters = jest.fn().mockReturnValue([pinnedFilter]);
    const { lensStore } = await renderApp();

    expect(lensStore.getState()).toEqual({
      lens: expect.objectContaining({
        query: { query: '', language: 'lucene' },
        filters: [pinnedFilter],
        resolvedDateRange: {
          fromDate: 'now-7d',
          toDate: 'now',
        },
      }),
    });

    expect(services.data.query.filterManager.getFilters).not.toHaveBeenCalled();
  });

  describe('extra nav menu entries', () => {
    it('shows custom menu entry', async () => {
      const runFn = jest.fn();
      props.topNavMenuEntryGenerators = [
        () => ({
          label: 'My entry',
          run: runFn,
        }),
      ];
      await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.arrayContaining([{ label: 'My entry', run: runFn }]),
        }),
        {}
      );
    });

    it('passes current state, filter, query timerange and initial context into getter', async () => {
      const getterFn = jest.fn();
      const preloadedState = {
        visualization: {
          activeId: 'lensXY',
          state: {
            visState: true,
          },
        },
        activeDatasourceId: 'testDatasource',
        datasourceStates: {
          testDatasource: {
            isLoading: false,
            state: { datasourceState: true },
          },
        },
        query: {
          language: 'kuery',
          query: 'A: B',
        },
        filters: [
          {
            meta: {
              key: 'abc',
            },
          },
        ],
      };
      props.topNavMenuEntryGenerators = [getterFn];
      props.initialContext = {
        fieldName: 'a',
        dataViewSpec: { id: '1' },
      };
      await renderApp({
        preloadedState,
      });

      expect(getterFn).toHaveBeenCalledWith(
        expect.objectContaining({
          initialContext: {
            fieldName: 'a',
            dataViewSpec: { id: '1' },
          },
          visualizationState: preloadedState.visualization.state,
          visualizationId: preloadedState.visualization.activeId,
          query: preloadedState.query,
          filters: preloadedState.filters,
          datasourceStates: {
            testDatasource: {
              isLoading: false,
              state: preloadedState.datasourceStates.testDatasource.state,
            },
          },
        })
      );
    });
  });

  describe('breadcrumbs', () => {
    const breadcrumbDocSavedObjectId = faker.string.uuid();
    const breadcrumbDoc = getLensDocumentMock({
      savedObjectId: breadcrumbDocSavedObjectId,
      title: 'Daaaaaaadaumching!',
    });

    it('sets breadcrumbs when the document title changes', async () => {
      const { lensStore } = await renderApp();

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Create' },
      ]);

      await act(async () => {
        await lensStore.dispatch(
          setState({
            persistedDoc: breadcrumbDoc,
          })
        );
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Daaaaaaadaumching!' },
      ]);
    });

    it('sets originatingApp breadcrumb when the document title changes', async () => {
      props.incomingState = { originatingApp: 'dashboards' };
      services.getOriginatingAppName = jest.fn(() => 'The Coolest Container Ever Made');
      const { lensStore, rerender } = await renderApp({
        preloadedState: { isLinkedToOriginatingApp: false },
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Create' },
      ]);

      await act(async () => {
        await rerender({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });

        lensStore.dispatch(
          setState({
            persistedDoc: breadcrumbDoc,
          })
        );
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Daaaaaaadaumching!' },
      ]);
    });

    it('sets serverless breadcrumbs when the document title changes when serverless service is available', async () => {
      const serverless = serverlessMock.createStart();
      services.serverless = serverless;
      const { lensStore, rerender } = await renderApp();
      expect(services.chrome.setBreadcrumbs).not.toHaveBeenCalled();
      expect(serverless.setBreadcrumbs).toHaveBeenCalledWith({ text: 'Create' });

      await act(async () => {
        rerender({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });
        lensStore.dispatch(
          setState({
            persistedDoc: breadcrumbDoc,
          })
        );
      });

      expect(services.chrome.setBreadcrumbs).not.toHaveBeenCalled();
      expect(serverless.setBreadcrumbs).toHaveBeenCalledWith({ text: 'Daaaaaaadaumching!' });
    });
  });

  describe('TopNavMenu#showDatePicker', () => {
    it('shows date picker if any used index pattern isTimeBased', async () => {
      services.dataViews.get = jest
        .fn()
        .mockImplementation(
          async (id) => ({ id, isTimeBased: () => true, isPersisted: () => true } as DataView)
        );
      await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showDatePicker: true }),
        {}
      );
    });
    it('shows date picker if active datasource isTimeBased', async () => {
      services.dataViews.get = jest
        .fn()
        .mockImplementation(
          async (id) => ({ id, isTimeBased: () => true, isPersisted: () => true } as DataView)
        );

      props.datasourceMap.testDatasource.isTimeBased = () => true;
      await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showDatePicker: true }),
        {}
      );
    });
    it('does not show date picker if index pattern nor active datasource is not time based', async () => {
      services.dataViews.get = jest
        .fn()
        .mockImplementation(
          async (id) => ({ id, isTimeBased: () => true, isPersisted: () => true } as DataView)
        );

      props.datasourceMap.testDatasource.isTimeBased = () => false;
      await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showDatePicker: false }),
        {}
      );
    });
  });

  describe('TopNavMenu#dataViewPickerProps', () => {
    it('calls the nav component with the correct dataview picker props if permissions are given', async () => {
      const { lensStore } = await renderApp();
      services.dataViewEditor.userPermissions.editDataView = () => true;
      const document = {
        savedObjectId: defaultSavedObjectId,
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      } as unknown as LensDocument;

      (services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock).mockClear();
      act(() => {
        lensStore.dispatch(
          setState({
            query: 'fake query' as unknown as Query,
            persistedDoc: document,
          })
        );
      });
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          dataViewPickerComponentProps: expect.objectContaining({
            currentDataViewId: 'mockip',
            onChangeDataView: expect.any(Function),
            onDataViewCreated: expect.any(Function),
            onAddField: expect.any(Function),
          }),
        }),
        {}
      );
    });
  });

  describe('persistence', () => {
    it('passes query and indexPatterns to TopNavMenu', async () => {
      const { lensStore } = await renderApp();
      const query = { query: 'fake query', language: 'kuery' };
      const document = getLensDocumentMock({
        savedObjectId: defaultSavedObjectId,
        state: {
          ...defaultDoc.state,
          query,
          filters: [{ query: { match_phrase: { src: 'test' } }, meta: {} }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      });

      await lensStore.dispatch(
        setState({
          query,
          persistedDoc: document,
        })
      );

      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query,
          indexPatterns: [
            {
              id: 'mockip',
              isTimeBased: expect.any(Function),
              fields: [],
              isPersisted: expect.any(Function),
              toSpec: expect.any(Function),
            },
          ],
        }),
        {}
      );
    });
    it('handles rejected index pattern', async () => {
      services.dataViews.get = jest
        .fn()
        .mockResolvedValue(Promise.reject({ reason: 'Could not locate that data view' }));
      await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ indexPatterns: [] }),
        {}
      );
    });

    describe('save buttons', () => {
      const querySaveButton = () => screen.queryByTestId('lnsApp_saveButton');
      const clickSaveButton = async () =>
        await act(async () => await userEvent.click(screen.getByTestId('lnsApp_saveButton')));

      const querySaveAndReturnButton = () => screen.queryByTestId('lnsApp_saveAndReturnButton');
      const waitForModalVisible = async () =>
        await waitFor(() => screen.getByTestId('savedObjectTitle'));

      async function save({
        preloadedState,
        savedObjectId = defaultSavedObjectId,
        prevSavedObjectId = undefined,
        newTitle = 'hello there',
        newCopyOnSave = false,
        comesFromDashboard = true,
        switchToAddToDashboardNone = false,
      }: {
        newCopyOnSave?: boolean;
        newTitle?: string;
        preloadedState?: Partial<LensAppState>;
        prevSavedObjectId?: string;
        savedObjectId?: string;
        comesFromDashboard?: boolean;
        switchToAddToDashboardNone?: boolean;
      }) {
        services.attributeService.saveToLibrary = jest.fn().mockResolvedValue(savedObjectId);
        services.attributeService.loadFromLibrary = jest.fn().mockResolvedValue({
          sharingSavedObjectProps: {
            outcome: 'exactMatch',
          },
          attributes: {
            savedObjectId,
            references: [],
            state: {
              query: { query: 'fake query', language: 'kuery' },
              filters: [],
            },
          },
          managed: false,
        });

        props = {
          ...props,
          initialInput: prevSavedObjectId ? { savedObjectId: prevSavedObjectId } : undefined,
        };

        if (comesFromDashboard) {
          props.incomingState = { originatingApp: 'dashboards' };
        }

        const { lensStore } = await renderApp({
          preloadedState: {
            isSaveable: true,
            isLinkedToOriginatingApp: comesFromDashboard,
            ...preloadedState,
          },
        });
        await clickSaveButton();
        await waitForModalVisible();
        if (newCopyOnSave) {
          await userEvent.click(screen.getByTestId('saveAsNewCheckbox'));
        }
        if (switchToAddToDashboardNone) {
          await userEvent.click(screen.getByLabelText('None'));
        }
        await waitFor(async () => {
          await userEvent.clear(screen.getByTestId('savedObjectTitle'));
          expect(screen.getByTestId('savedObjectTitle')).toHaveValue('');
        });
        await userEvent.type(screen.getByTestId('savedObjectTitle'), `${newTitle}`);
        await userEvent.click(screen.getByTestId('confirmSaveSavedObjectButton'));
        await waitToLoad();
        return { props, lensStore };
      }

      it('shows a disabled save button when the user does not have permissions', async () => {
        services.application.capabilities = {
          ...services.application.capabilities,
          visualize_v2: { save: false, show: true },
          dashboard_v2: {
            showWriteControls: false,
          },
        };
        await renderApp({ preloadedState: { isSaveable: true } });
        expect(querySaveButton()).toBeDisabled();
      });

      it('shows a save button that is enabled when the frame has provided its state and does not show save and return or save as', async () => {
        await renderApp({
          preloadedState: { isSaveable: true },
        });

        expect(querySaveButton()).toHaveTextContent('Save');
        expect(querySaveAndReturnButton()).toBeFalsy();
      });

      it('Shows Save and Return and Save to library buttons in create by value mode with originating app', async () => {
        props.incomingState = {
          originatingApp: 'dashboards',
          valueInput: {
            id: 'whatchaGonnaDoWith',
            attributes: {
              title:
                'whatcha gonna do with all these references? All these references in your value Input',
              references: [],
            },
          } as unknown as LensSerializedState,
        };
        await renderApp({
          preloadedState: {
            isLinkedToOriginatingApp: true,
            isSaveable: true,
          },
        });

        expect(querySaveAndReturnButton()).toBeEnabled();
        expect(querySaveButton()).toHaveTextContent('Save to library');
      });

      it('Shows Save and Return and Save As buttons in edit by reference mode', async () => {
        props.incomingState = {
          originatingApp: 'dashboards',
        };
        props.initialInput = { savedObjectId: defaultSavedObjectId, id: '5678' };
        await renderApp({
          preloadedState: {
            isSaveable: true,
            isLinkedToOriginatingApp: true,
          },
        });

        expect(querySaveAndReturnButton()).toBeEnabled();
        expect(querySaveButton()).toHaveTextContent('Save as');
      });

      it('applies all changes on-save', async () => {
        const { lensStore } = await save({
          savedObjectId: undefined,
          newCopyOnSave: false,
          newTitle: 'hello there',
          preloadedState: {
            applyChangesCounter: 0,
          },
        });
        expect(lensStore.getState().lens.applyChangesCounter).toBe(1);
      });
      it('adds to the recently accessed list on save', async () => {
        const savedObjectId = faker.string.uuid();
        await save({ savedObjectId, prevSavedObjectId: 'prevId', comesFromDashboard: false });
        expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
          `/app/lens#/edit/${savedObjectId}`,
          'hello there',
          savedObjectId
        );
      });

      it('saves new docs', async () => {
        await save({
          prevSavedObjectId: undefined,
          savedObjectId: defaultSavedObjectId,
          newTitle: 'hello there',
          comesFromDashboard: false,
          switchToAddToDashboardNone: true,
        });
        expect(services.attributeService.saveToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'hello there',
          }),
          // from mocks
          [
            {
              id: 'mockip',
              name: 'mockip',
              type: 'index-pattern',
            },
          ],
          undefined
        );
        expect(props.redirectTo).toHaveBeenCalledWith(defaultSavedObjectId);
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
      });

      it('saves existing docs as a copy', async () => {
        const doc = getLensDocumentMock();
        await save({
          savedObjectId: doc.savedObjectId,
          newCopyOnSave: true,
          newTitle: 'hello there',
          preloadedState: { persistedDoc: doc },
          prevSavedObjectId: 'prevId',
          comesFromDashboard: false,
        });
        expect(services.attributeService.saveToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'hello there',
          }),
          [{ id: 'mockip', name: 'mockip', type: 'index-pattern' }],
          undefined
        );
        // new copy gets a new SO id
        expect(props.redirectTo).toHaveBeenCalledWith(doc.savedObjectId);
        expect(services.attributeService.saveToLibrary).toHaveBeenCalledTimes(1);
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
      });

      it('saves existing docs', async () => {
        await save({
          savedObjectId: defaultSavedObjectId,
          prevSavedObjectId: defaultSavedObjectId,
          newCopyOnSave: false,
          newTitle: 'hello there',
          comesFromDashboard: false,
          preloadedState: {
            persistedDoc: getLensDocumentMock({ savedObjectId: defaultSavedObjectId }),
          },
        });
        expect(services.attributeService.saveToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'hello there',
          }),
          [{ id: 'mockip', name: 'mockip', type: 'index-pattern' }],
          defaultSavedObjectId
        );
        expect(props.redirectTo).not.toHaveBeenCalled();
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
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

        await save({
          savedObjectId: defaultSavedObjectId,
          prevSavedObjectId: defaultSavedObjectId,
          preloadedState: {
            isSaveable: true,
            persistedDoc: getLensDocumentMock({ savedObjectId: defaultSavedObjectId }),
            isLinkedToOriginatingApp: true,
            filters: [pinned, unpinned],
          },
        });

        const { state: expectedFilters } = services.data.query.filterManager.extract([unpinned]);

        expect(services.attributeService.saveToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'hello there',
            state: expect.objectContaining({ filters: expectedFilters }),
          }),
          [{ id: 'mockip', name: 'mockip', type: 'index-pattern' }],
          undefined
        );
      });

      it('checks for duplicate title before saving', async () => {
        await save({
          savedObjectId: defaultSavedObjectId,
          prevSavedObjectId: defaultSavedObjectId,
          preloadedState: {
            isSaveable: true,
            persistedDoc: { savedObjectId: defaultSavedObjectId } as unknown as LensDocument,
            isLinkedToOriginatingApp: true,
          },
        });

        expect(checkForDuplicateTitle).toHaveBeenCalledWith(
          {
            copyOnSave: true,
            displayName: 'Lens visualization',
            isTitleDuplicateConfirmed: false,
            lastSavedTitle: '',
            title: 'hello there',
          },
          expect.any(Function),
          expect.anything()
        );
      });

      it('saves new doc and redirects to originating app', async () => {
        await save({
          savedObjectId: undefined,
          newCopyOnSave: false,
          newTitle: 'hello there',
        });
        expect(services.attributeService.saveToLibrary).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'hello there',
          }),
          [{ id: 'mockip', name: 'mockip', type: 'index-pattern' }],
          undefined
        );
        expect(props.redirectToOrigin).toHaveBeenCalledWith({
          state: expect.objectContaining({ savedObjectId: defaultSavedObjectId }),
          isCopied: false,
        });
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const mockedConsoleDir = jest.spyOn(console, 'dir').mockImplementation(() => {}); // mocked console.dir to avoid messages in the console when running tests

        services.attributeService.saveToLibrary = jest
          .fn()
          .mockRejectedValue({ message: 'failed' });

        props.incomingState = {
          originatingApp: 'dashboards',
        };

        await renderApp({
          preloadedState: {
            isSaveable: true,
            isLinkedToOriginatingApp: true,
          },
        });
        await clickSaveButton();
        await userEvent.type(screen.getByTestId('savedObjectTitle'), 'hello there');
        await userEvent.click(screen.getByTestId('confirmSaveSavedObjectButton'));
        await waitToLoad();

        expect(props.redirectTo).not.toHaveBeenCalled();
        expect(services.attributeService.saveToLibrary).toHaveBeenCalled();
        // eslint-disable-next-line no-console
        expect(console.dir).toHaveBeenCalledTimes(1);
        mockedConsoleDir.mockRestore();
      });

      it('does not show the copy button on first save', async () => {
        props.incomingState = {
          originatingApp: 'dashboards',
        };

        await renderApp({
          preloadedState: { isSaveable: true, isLinkedToOriginatingApp: true },
        });
        await clickSaveButton();
        await waitForModalVisible();
        expect(screen.queryByTestId('saveAsNewCheckbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('share button', () => {
    const getShareButton = () => screen.getByTestId('lnsApp_shareButton');

    it('should be disabled when no data is available', async () => {
      await renderApp({ preloadedState: { isSaveable: true } });
      expect(getShareButton()).toBeDisabled();
    });

    it('should not disable share when not saveable', async () => {
      await renderApp({
        preloadedState: {
          isSaveable: false,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });

      expect(getShareButton()).toBeEnabled();
    });

    it('should still be enabled even if the user is missing save permissions', async () => {
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize_v2: { save: false, show: true, createShortUrl: true },
      };

      await renderApp({
        preloadedState: {
          isSaveable: true,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });
      expect(getShareButton()).toBeEnabled();
    });

    it('should still be enabled even if the user is missing shortUrl permissions', async () => {
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize_v2: { save: true, show: true, createShortUrl: false },
      };

      await renderApp({
        preloadedState: {
          isSaveable: true,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });

      expect(getShareButton()).toBeEnabled();
    });

    it('should be disabled if the user is missing shortUrl permissions and visualization is not saveable', async () => {
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize_v2: { save: false, show: true, createShortUrl: false },
      };

      await renderApp({
        preloadedState: {
          isSaveable: false,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });
      expect(getShareButton()).toBeDisabled();
    });
  });

  describe('inspector', () => {
    it('inspector button should be available', async () => {
      await renderApp({
        preloadedState: { isSaveable: true },
      });
      expect(screen.getByTestId('lnsApp_inspectButton')).toBeEnabled();
    });
    it('should open inspect panel', async () => {
      await renderApp({
        preloadedState: { isSaveable: true },
      });
      await userEvent.click(screen.getByTestId('lnsApp_inspectButton'));
      expect(services.inspector.inspect).toHaveBeenCalledTimes(1);
    });
  });

  describe('query bar state management', () => {
    it('uses the default time and query language settings', async () => {
      const { lensStore } = await renderApp();
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: '', language: 'lucene' },
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
        }),
        {}
      );

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          query: { query: '', language: 'lucene' },
          resolvedDateRange: {
            fromDate: 'now-7d',
            toDate: 'now',
          },
        }),
      });
    });

    it('updates the editor frame when the user changes query or time in the search bar', async () => {
      const { lensStore } = await renderApp();
      (services.data.query.timefilter.timefilter.calculateBounds as jest.Mock).mockReturnValue({
        min: moment('2021-01-09T04:00:00.000Z'),
        max: moment('2021-01-09T08:00:00.000Z'),
      });
      const onQuerySubmit = (services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock).mock
        .calls[0][0].onQuerySubmit;
      await act(async () =>
        onQuerySubmit({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );

      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'new', language: 'lucene' },
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
        }),
        {}
      );
      expect(services.data.query.timefilter.timefilter.setTime).toHaveBeenCalledWith({
        from: 'now-14d',
        to: 'now-7d',
      });

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          query: { query: 'new', language: 'lucene' },
          resolvedDateRange: {
            fromDate: 'now-14d',
            toDate: 'now-7d',
          },
        }),
      });
    });

    it('updates the filters when the user changes them', async () => {
      const { lensStore } = await renderApp();
      const indexPattern = { id: 'index1', isPersisted: () => true } as unknown as DataView;
      const field = { name: 'myfield' } as unknown as FieldSpec;
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [],
        }),
      });

      services.data.query.filterManager.setFilters([buildExistsFilter(field, indexPattern)]);

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [buildExistsFilter(field, indexPattern)],
        }),
      });
    });

    it('updates the searchSessionId when the user changes query or time in the search bar', async () => {
      const { lensStore } = await renderApp();

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-1`,
        }),
      });

      const AggregateQueryTopNavMenu = services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock;
      const onQuerySubmit = AggregateQueryTopNavMenu.mock.calls[0][0].onQuerySubmit;
      act(() =>
        onQuerySubmit({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: '', language: 'lucene' },
        })
      );

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-2`,
        }),
      });
      // trigger again, this time changing just the query
      act(() =>
        onQuerySubmit({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-3`,
        }),
      });
      const indexPattern = { id: 'index1', isPersisted: () => true } as unknown as DataView;
      const field = { name: 'myfield' } as unknown as FieldSpec;
      act(() =>
        services.data.query.filterManager.setFilters([buildExistsFilter(field, indexPattern)])
      );

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-4`,
        }),
      });
    });
  });

  describe('saved query handling', () => {
    it('persists the saved query ID when the query is saved', async () => {
      await renderApp();

      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: undefined,
          onSaved: expect.any(Function),
          onSavedQueryUpdated: expect.any(Function),
          onClearSavedQuery: expect.any(Function),
        }),
        {}
      );

      const onSaved = (services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock).mock
        .calls[0][0].onSaved;
      act(() => {
        onSaved({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '1',
            attributes: {
              title: '',
              description: '',
              query: { query: '', language: 'lucene' },
            },
            namespaces: ['default'],
          },
        }),
        {}
      );
    });

    it('changes the saved query ID when the query is updated', async () => {
      await renderApp();
      const { onSaved, onSavedQueryUpdated } = (
        services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock
      ).mock.calls[0][0];
      act(() => {
        onSaved({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      act(() => {
        onSavedQueryUpdated({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '2',
            attributes: {
              title: 'new title',
              description: '',
              query: { query: '', language: 'lucene' },
            },
            namespaces: ['default'],
          },
        }),
        {}
      );
    });

    it('updates the query if saved query is selected', async () => {
      await renderApp();
      const { onSavedQueryUpdated } = (services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock)
        .mock.calls[0][0];
      act(() => {
        onSavedQueryUpdated({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: 'abc:def', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      expect(services.navigation.ui.AggregateQueryTopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'abc:def', language: 'lucene' },
        }),
        {}
      );
    });

    it('clears all existing unpinned filters when the active saved query is cleared', async () => {
      const { lensStore } = await renderApp();
      const { onQuerySubmit, onClearSavedQuery } = (
        services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock
      ).mock.calls[0][0];
      act(() =>
        onQuerySubmit({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      const indexPattern = { id: 'index1', isPersisted: () => true } as unknown as DataView;
      const field = { name: 'myfield' } as unknown as FieldSpec;
      const pinnedField = { name: 'pinnedField' } as unknown as FieldSpec;
      const unpinned = buildExistsFilter(field, indexPattern);
      const pinned = buildExistsFilter(pinnedField, indexPattern);
      FilterManager.setFiltersStore([pinned], FilterStateStore.GLOBAL_STATE);
      act(() => services.data.query.filterManager.setFilters([pinned, unpinned]));
      act(() => onClearSavedQuery());
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [pinned],
        }),
      });
    });
  });

  describe('search session id management', () => {
    it('updates the searchSessionId when the query is updated', async () => {
      const { lensStore } = await renderApp();
      const { onSaved, onSavedQueryUpdated } = (
        services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock
      ).mock.calls[0][0];
      act(() => {
        onSaved({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      act(() => {
        onSavedQueryUpdated({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
          namespaces: ['default'],
        });
      });
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-2`,
        }),
      });
    });

    it('updates the searchSessionId when the active saved query is cleared', async () => {
      const { lensStore } = await renderApp();
      const { onQuerySubmit, onClearSavedQuery } = (
        services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock
      ).mock.calls[0][0];
      act(() =>
        onQuerySubmit({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      const indexPattern = { id: 'index1', isPersisted: () => true } as unknown as DataView;
      const field = { name: 'myfield' } as unknown as FieldSpec;
      const pinnedField = { name: 'pinnedField' } as unknown as FieldSpec;
      const unpinned = buildExistsFilter(field, indexPattern);
      const pinned = buildExistsFilter(pinnedField, indexPattern);
      FilterManager.setFiltersStore([pinned], FilterStateStore.GLOBAL_STATE);
      act(() => services.data.query.filterManager.setFilters([pinned, unpinned]));
      act(() => onClearSavedQuery());
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-4`,
        }),
      });
    });

    it('dispatches update to searchSessionId and dateRange when the user hits refresh', async () => {
      const { lensStore } = await renderApp();
      const { onQuerySubmit } = (services.navigation.ui.AggregateQueryTopNavMenu as jest.Mock).mock
        .calls[0][0];
      act(() =>
        onQuerySubmit({
          dateRange: { from: 'now-7d', to: 'now' },
        })
      );
      expect(lensStore.dispatch).toHaveBeenCalledWith({
        type: 'lens/setState',
        payload: {
          resolvedDateRange: {
            fromDate: 'now-7d',
            toDate: 'now',
          },
          searchSessionId: 'sessionId-2',
        },
      });
    });

    it('updates the state if session id changes from the outside', async () => {
      const sessionIdS = new Subject<string>();
      services = makeDefaultServices(sessionIdS, 'sessionId-1');
      const { lensStore } = await renderApp();

      act(() => sessionIdS.next('new-session-id'));

      await waitToLoad();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `new-session-id`,
        }),
      });
    });

    it('does not update the searchSessionId when the state changes', async () => {
      const { lensStore } = await renderApp({ preloadedState: { isSaveable: true } });
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-1`,
        }),
      });
    });
  });

  describe('showing a confirm message when leaving', () => {
    const defaultLeave = jest.fn();
    const confirmLeave = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not show a confirm message if there is no expression to save', async () => {
      await renderApp();
      const lastCall = (props.onAppLeave as jest.Mock).mock.lastCall![0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('does not confirm if the user is missing save permissions', async () => {
      services.application.capabilities = {
        ...services.application.capabilities,
        visualize_v2: { save: false, show: true },
      };
      await renderApp({
        preloadedState: { isSaveable: true },
      });
      const lastCall = (props.onAppLeave as jest.Mock).mock.lastCall![0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with an unsaved doc', async () => {
      await renderApp({
        preloadedState: {
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          isSaveable: true,
        },
      });
      const lastCall = (props.onAppLeave as jest.Mock).mock.calls[
        (props.onAppLeave as jest.Mock).mock.calls.length - 1
      ][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with unsaved changes to an existing doc', async () => {
      await renderApp({
        preloadedState: {
          persistedDoc: getLensDocumentMock(),
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          isSaveable: true,
        },
      });
      const lastCall = (props.onAppLeave as jest.Mock).mock.lastCall![0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving from a context initial doc with changes made in lens', async () => {
      props.contextOriginatingApp = 'TSVB';
      props.initialContext = {
        layers: [
          {
            indexPatternId: 'indexPatternId',
            chartType: 'area',
            axisPosition: 'left',
            palette: {
              type: 'palette',
              name: 'default',
            },
            metrics: [
              {
                agg: 'count',
                isFullReference: false,
                fieldName: 'document',
                params: {},
                color: '#68BC00',
              },
            ],
            timeInterval: 'auto',
          },
        ],
        type: 'lnsXY',
        savedObjectId: '',
        vizEditorOriginatingAppUrl: '#/tsvb-link',
        isVisualizeAction: true,
      } as unknown as VisualizeEditorContext;

      await renderApp({
        preloadedState: {
          persistedDoc: getLensDocumentMock(),
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          isSaveable: true,
        },
      });
      const lastCall = (props.onAppLeave as jest.Mock).mock.lastCall![0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).not.toHaveBeenCalled();
      expect(confirmLeave).toHaveBeenCalled();
    });

    it('should not confirm when changes are saved', async () => {
      const localDoc = getLensDocumentMock();
      const preloadedState = {
        persistedDoc: {
          ...localDoc,
          state: {
            ...localDoc.state,
            datasourceStates: {
              testDatasource: 'datasource',
            },
            visualization: {},
          },
        },
        isSaveable: true,
        ...(localDoc.state as Partial<LensAppState>),
        visualization: {
          activeId: 'testVis',
          state: {},
        },
      };

      props.datasourceMap.testDatasource.isEqual = jest.fn().mockReturnValue(true); // if this returns false, the documents won't be accounted equal

      await renderApp({ preloadedState });

      const lastCallArg = props.onAppLeave.mock.lastCall![0];
      lastCallArg?.({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when the latest doc is invalid', async () => {
      const { lensStore } = await renderApp();
      await act(async () => {
        await lensStore.dispatch(
          setState({
            persistedDoc: getLensDocumentMock(),
            isSaveable: true,
          })
        );
      });
      const lastCall = (props.onAppLeave as jest.Mock).mock.lastCall![0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });
  });

  it('should display a conflict callout if saved object conflicts', async () => {
    const history = createMemoryHistory();
    props.history = {
      ...history,
      location: {
        ...history.location,
        search: '?_g=test',
      },
    };
    await renderApp({
      preloadedState: {
        persistedDoc: getLensDocumentMock({ savedObjectId: defaultSavedObjectId }),
        sharingSavedObjectProps: {
          outcome: 'conflict',
          aliasTargetId: '2',
        },
      },
    });
    expect(services.spaces?.ui.components.getLegacyUrlConflict).toHaveBeenCalledWith({
      currentObjectId: defaultSavedObjectId,
      objectNoun: 'Lens visualization',
      otherObjectId: '2',
      otherObjectPath: '#/edit/2?_g=test',
    });
  });
});
