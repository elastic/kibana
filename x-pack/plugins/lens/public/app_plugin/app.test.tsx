/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App } from './app';
import { LensAppProps, LensAppServices } from './types';
import { EditorFrameInstance, EditorFrameProps } from '../types';
import { Document } from '../persistence';
import {
  createMockDatasource,
  createMockVisualization,
  DatasourceMock,
  makeDefaultServices,
  mountWithProvider,
} from '../mocks';
import { I18nProvider } from '@kbn/i18n/react';
import {
  SavedObjectSaveModal,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { createMemoryHistory } from 'history';
import {
  esFilters,
  FilterManager,
  IFieldType,
  IIndexPattern,
  Query,
} from '../../../../../src/plugins/data/public';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { LensByValueInput } from '../embeddable/embeddable';
import { SavedObjectReference } from '../../../../../src/core/types';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';
import moment from 'moment';

import { setState, LensAppState } from '../state_management/index';
jest.mock('../editor_frame_service/editor_frame/expression_helpers');
jest.mock('src/core/public');
jest.mock('../../../../../src/plugins/saved_objects/public', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { SavedObjectSaveModal, SavedObjectSaveModalOrigin } = jest.requireActual(
    '../../../../../src/plugins/saved_objects/public'
  );
  return {
    SavedObjectSaveModal,
    SavedObjectSaveModalOrigin,
    checkForDuplicateTitle: jest.fn(),
  };
});

jest.mock('lodash', () => {
  const original = jest.requireActual('lodash');

  return {
    ...original,
    debounce: (fn: unknown) => fn,
  };
});

// const navigationStartMock = navigationPluginMock.createStartContract();

const sessionIdSubject = new Subject<string>();

describe('Lens App', () => {
  let defaultDoc: Document;
  let defaultSavedObjectId: string;
  const mockDatasource: DatasourceMock = createMockDatasource('testDatasource');
  const mockDatasource2: DatasourceMock = createMockDatasource('testDatasource2');
  const datasourceMap = {
    testDatasource2: mockDatasource2,
    testDatasource: mockDatasource,
  };

  const mockVisualization = {
    ...createMockVisualization(),
    id: 'testVis',
    visualizationTypes: [
      {
        icon: 'empty',
        id: 'testVis',
        label: 'TEST1',
        groupLabel: 'testVisGroup',
      },
    ],
  };
  const visualizationMap = {
    testVis: mockVisualization,
  };

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
    };
  }

  async function mountWith({
    props = makeDefaultProps(),
    services = makeDefaultServices(sessionIdSubject),
    preloadedState,
  }: {
    props?: jest.Mocked<LensAppProps>;
    services?: jest.Mocked<LensAppServices>;
    preloadedState?: Partial<LensAppState>;
  }) {
    const wrappingComponent: React.FC<{
      children: React.ReactNode;
    }> = ({ children }) => {
      return (
        <I18nProvider>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </I18nProvider>
      );
    };

    const { instance, lensStore } = await mountWithProvider(
      <App {...props} />,
      {
        data: services.data,
        preloadedState,
      },
      { wrappingComponent }
    );

    const frame = props.editorFrame as ReturnType<typeof createMockFrame>;
    return { instance, frame, props, services, lensStore };
  }

  beforeEach(() => {
    defaultSavedObjectId = '1234';
    defaultDoc = ({
      savedObjectId: defaultSavedObjectId,
      title: 'An extremely cool default document!',
      expression: 'definitely a valid expression',
      state: {
        query: 'lucene',
        filters: [{ query: { match_phrase: { src: 'test' } } }],
      },
      references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
    } as unknown) as Document;
  });

  it('renders the editor frame', async () => {
    const { frame } = await mountWith({});
    expect(frame.EditorFrameContainer.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "showNoDataPopover": [Function],
          },
          Object {},
        ],
      ]
    `);
  });

  it('updates global filters with store state', async () => {
    const services = makeDefaultServices(sessionIdSubject);
    const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
    const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
    const pinnedFilter = esFilters.buildExistsFilter(pinnedField, indexPattern);
    services.data.query.filterManager.getFilters = jest.fn().mockImplementation(() => {
      return [];
    });
    services.data.query.filterManager.getGlobalFilters = jest.fn().mockImplementation(() => {
      return [pinnedFilter];
    });
    const { instance, lensStore } = await mountWith({ services });

    instance.update();
    expect(lensStore.getState()).toEqual({
      lens: expect.objectContaining({
        query: { query: '', language: 'lucene' },
        filters: [pinnedFilter],
        resolvedDateRange: {
          fromDate: '2021-01-10T04:00:00.000Z',
          toDate: '2021-01-10T08:00:00.000Z',
        },
      }),
    });

    expect(services.data.query.filterManager.getFilters).not.toHaveBeenCalled();
  });

  describe('breadcrumbs', () => {
    const breadcrumbDocSavedObjectId = defaultSavedObjectId;
    const breadcrumbDoc = ({
      savedObjectId: breadcrumbDocSavedObjectId,
      title: 'Daaaaaaadaumching!',
      state: {
        query: 'fake query',
        filters: [],
      },
      references: [],
    } as unknown) as Document;

    it('sets breadcrumbs when the document title changes', async () => {
      const { instance, services, lensStore } = await mountWith({});

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Create' },
      ]);

      await act(async () => {
        instance.setProps({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });
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

    it('sets originatingApp breadcrumb when the document title changes', async () => {
      const props = makeDefaultProps();
      const services = makeDefaultServices(sessionIdSubject);
      props.incomingState = { originatingApp: 'coolContainer' };
      services.getOriginatingAppName = jest.fn(() => 'The Coolest Container Ever Made');

      const { instance, lensStore } = await mountWith({
        props,
        services,
        preloadedState: {
          isLinkedToOriginatingApp: true,
        },
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Create' },
      ]);

      await act(async () => {
        instance.setProps({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });

        lensStore.dispatch(
          setState({
            persistedDoc: breadcrumbDoc,
          })
        );
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
        {
          text: 'Visualize Library',
          href: '/testbasepath/app/visualize#/',
          onClick: expect.anything(),
        },
        { text: 'Daaaaaaadaumching!' },
      ]);
    });
  });

  describe('persistence', () => {
    it('passes query and indexPatterns to TopNavMenu', async () => {
      const { instance, lensStore, services } = await mountWith({ preloadedState: {} });
      const document = ({
        savedObjectId: defaultSavedObjectId,
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      } as unknown) as Document;

      act(() => {
        lensStore.dispatch(
          setState({
            query: ('fake query' as unknown) as Query,
            persistedDoc: document,
          })
        );
      });
      instance.update();

      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fake query',
          indexPatterns: [{ id: 'mockip' }],
        }),
        {}
      );
    });

    describe('save buttons', () => {
      interface SaveProps {
        newCopyOnSave: boolean;
        returnToOrigin?: boolean;
        newTitle: string;
      }

      function getButton(inst: ReactWrapper): TopNavMenuData {
        return (inst
          .find('[data-test-subj="lnsApp_topNav"]')
          .prop('config') as TopNavMenuData[]).find(
          (button) => button.testId === 'lnsApp_saveButton'
        )!;
      }

      async function testSave(inst: ReactWrapper, saveProps: SaveProps) {
        await getButton(inst).run(inst.getDOMNode());
        inst.update();
        const handler = inst.find('SavedObjectSaveModalOrigin').prop('onSave') as (
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

        const services = makeDefaultServices(sessionIdSubject);
        services.attributeService.wrapAttributes = jest
          .fn()
          .mockImplementation(async ({ savedObjectId }) => ({
            savedObjectId: savedObjectId || 'aaa',
          }));
        services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
          savedObjectId: initialSavedObjectId ?? 'aaa',
          references: [],
          state: {
            query: 'fake query',
            filters: [],
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
        expect(getButton(instance).disableButton).toEqual(false);
        await act(async () => {
          testSave(instance, { ...saveProps });
        });
        return { props, services, instance, frame, lensStore };
      }

      it('shows a disabled save button when the user does not have permissions', async () => {
        const services = makeDefaultServices(sessionIdSubject);
        services.application = {
          ...services.application,
          capabilities: {
            ...services.application.capabilities,
            visualize: { save: false, saveQuery: false, show: true },
          },
        };
        const { instance, lensStore } = await mountWith({ services });
        expect(getButton(instance).disableButton).toEqual(true);
        act(() => {
          lensStore.dispatch(
            setState({
              isSaveable: true,
            })
          );
        });
        instance.update();
        expect(getButton(instance).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when the frame has provided its state and does not show save and return or save as', async () => {
        const { instance, lensStore, services } = await mountWith({});
        expect(getButton(instance).disableButton).toEqual(true);
        act(() => {
          lensStore.dispatch(
            setState({
              isSaveable: true,
            })
          );
        });
        instance.update();
        expect(getButton(instance).disableButton).toEqual(false);

        await act(async () => {
          const topNavMenuConfig = instance.find(services.navigation.ui.TopNavMenu).prop('config');
          expect(topNavMenuConfig).not.toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAndReturnButton)
          );
          expect(topNavMenuConfig).not.toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAsButton)
          );
          expect(topNavMenuConfig).toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveButton)
          );
        });
      });

      it('Shows Save and Return and Save As buttons in create by value mode with originating app', async () => {
        const props = makeDefaultProps();
        const services = makeDefaultServices(sessionIdSubject);
        services.dashboardFeatureFlag = { allowByValueEmbeddables: true };
        props.incomingState = {
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

        const { instance } = await mountWith({
          props,
          services,
          preloadedState: {
            isLinkedToOriginatingApp: true,
          },
        });

        await act(async () => {
          const topNavMenuConfig = instance.find(services.navigation.ui.TopNavMenu).prop('config');
          expect(topNavMenuConfig).toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAndReturnButton)
          );
          expect(topNavMenuConfig).toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAsButton)
          );
          expect(topNavMenuConfig).not.toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveButton)
          );
        });
      });

      it('Shows Save and Return and Save As buttons in edit by reference mode', async () => {
        const props = makeDefaultProps();
        props.initialInput = { savedObjectId: defaultSavedObjectId, id: '5678' };
        props.incomingState = {
          originatingApp: 'ultraDashboard',
        };

        const { instance, services } = await mountWith({
          props,
          preloadedState: {
            isLinkedToOriginatingApp: true,
          },
        });

        await act(async () => {
          const topNavMenuConfig = instance.find(services.navigation.ui.TopNavMenu).prop('config');
          expect(topNavMenuConfig).toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAndReturnButton)
          );
          expect(topNavMenuConfig).toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveAsButton)
          );
          expect(topNavMenuConfig).not.toContainEqual(
            expect.objectContaining(navMenuItems.expectedSaveButton)
          );
        });
      });

      it('saves new docs', async () => {
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
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
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
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
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
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const services = makeDefaultServices(sessionIdSubject);
        services.attributeService.wrapAttributes = jest
          .fn()
          .mockRejectedValue({ message: 'failed' });
        const { instance, props } = await mountWith({
          services,
          preloadedState: {
            isSaveable: true,
          },
        });

        await act(async () => {
          testSave(instance, { newCopyOnSave: false, newTitle: 'hello there' });
        });
        expect(props.redirectTo).not.toHaveBeenCalled();
        expect(getButton(instance).disableButton).toEqual(false);
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
        const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
        const field = ({ name: 'myfield' } as unknown) as IFieldType;
        const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
        const unpinned = esFilters.buildExistsFilter(field, indexPattern);
        const pinned = esFilters.buildExistsFilter(pinnedField, indexPattern);
        await act(async () => {
          FilterManager.setFiltersStore([pinned], esFilters.FilterStateStore.GLOBAL_STATE);
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
        expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
          expect.objectContaining({
            savedObjectId: defaultSavedObjectId,
            title: 'hello there2',
            state: expect.objectContaining({
              filters: [unpinned],
            }),
          }),
          true,
          { id: '5678', savedObjectId: defaultSavedObjectId }
        );
      });

      it('checks for duplicate title before saving', async () => {
        const services = makeDefaultServices(sessionIdSubject);
        services.attributeService.wrapAttributes = jest
          .fn()
          .mockReturnValue(Promise.resolve({ savedObjectId: '123' }));
        const { instance } = await mountWith({
          services,
          preloadedState: {
            isSaveable: true,
            persistedDoc: ({ savedObjectId: '123' } as unknown) as Document,
          },
        });
        await act(async () => {
          instance.setProps({ initialInput: { savedObjectId: '123' } });
          getButton(instance).run(instance.getDOMNode());
        });
        instance.update();
        const onTitleDuplicate = jest.fn();
        await act(async () => {
          instance.find(SavedObjectSaveModal).prop('onSave')({
            onTitleDuplicate,
            isTitleDuplicateConfirmed: false,
            newCopyOnSave: false,
            newDescription: '',
            newTitle: 'test',
          });
        });
        expect(checkForDuplicateTitle).toHaveBeenCalledWith(
          expect.objectContaining({ id: '123' }),
          false,
          onTitleDuplicate,
          expect.anything()
        );
      });

      it('does not show the copy button on first save', async () => {
        const { instance } = await mountWith({ preloadedState: { isSaveable: true } });
        await act(async () => getButton(instance).run(instance.getDOMNode()));
        instance.update();
        expect(instance.find(SavedObjectSaveModal).prop('showCopyOnSave')).toEqual(false);
      });
    });
  });

  describe('download button', () => {
    function getButton(inst: ReactWrapper): TopNavMenuData {
      return (inst
        .find('[data-test-subj="lnsApp_topNav"]')
        .prop('config') as TopNavMenuData[]).find(
        (button) => button.testId === 'lnsApp_downloadCSVButton'
      )!;
    }

    it('should be disabled when no data is available', async () => {
      const { instance } = await mountWith({ preloadedState: { isSaveable: true } });
      expect(getButton(instance).disableButton).toEqual(true);
    });

    it('should disable download when not saveable', async () => {
      const { instance } = await mountWith({
        preloadedState: {
          isSaveable: false,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });

      expect(getButton(instance).disableButton).toEqual(true);
    });

    it('should still be enabled even if the user is missing save permissions', async () => {
      const services = makeDefaultServices(sessionIdSubject);
      services.application = {
        ...services.application,
        capabilities: {
          ...services.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };

      const { instance } = await mountWith({
        services,
        preloadedState: {
          isSaveable: true,
          activeData: { layer1: { type: 'datatable', columns: [], rows: [] } },
        },
      });
      expect(getButton(instance).disableButton).toEqual(false);
    });
  });

  describe('query bar state management', () => {
    it('uses the default time and query language settings', async () => {
      const { lensStore, services } = await mountWith({});
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
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
            fromDate: '2021-01-10T04:00:00.000Z',
            toDate: '2021-01-10T08:00:00.000Z',
          },
        }),
      });
    });

    it('updates the editor frame when the user changes query or time in the search bar', async () => {
      const { instance, services, lensStore } = await mountWith({});
      (services.data.query.timefilter.timefilter.calculateBounds as jest.Mock).mockReturnValue({
        min: moment('2021-01-09T04:00:00.000Z'),
        max: moment('2021-01-09T08:00:00.000Z'),
      });
      act(() =>
        instance.find(services.navigation.ui.TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      instance.update();
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
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
            fromDate: '2021-01-09T04:00:00.000Z',
            toDate: '2021-01-09T08:00:00.000Z',
          },
        }),
      });
    });

    it('updates the filters when the user changes them', async () => {
      const { instance, services, lensStore } = await mountWith({});
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [],
        }),
      });
      act(() =>
        services.data.query.filterManager.setFilters([
          esFilters.buildExistsFilter(field, indexPattern),
        ])
      );
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [esFilters.buildExistsFilter(field, indexPattern)],
        }),
      });
    });

    it('updates the searchSessionId when the user changes query or time in the search bar', async () => {
      const { instance, services, lensStore } = await mountWith({});

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-1`,
        }),
      });

      act(() =>
        instance.find(services.navigation.ui.TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: '', language: 'lucene' },
        })
      );
      instance.update();

      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-2`,
        }),
      });
      // trigger again, this time changing just the query
      act(() =>
        instance.find(services.navigation.ui.TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-3`,
        }),
      });
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      act(() =>
        services.data.query.filterManager.setFilters([
          esFilters.buildExistsFilter(field, indexPattern),
        ])
      );
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-4`,
        }),
      });
    });
  });

  describe('saved query handling', () => {
    it('does not allow saving when the user is missing the saveQuery permission', async () => {
      const services = makeDefaultServices(sessionIdSubject);
      services.application = {
        ...services.application,
        capabilities: {
          ...services.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };
      await mountWith({ services });
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showSaveQuery: false }),
        {}
      );
    });

    it('persists the saved query ID when the query is saved', async () => {
      const { instance, services } = await mountWith({});
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          showSaveQuery: true,
          savedQuery: undefined,
          onSaved: expect.any(Function),
          onSavedQueryUpdated: expect.any(Function),
          onClearSavedQuery: expect.any(Function),
        }),
        {}
      );
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '1',
            attributes: {
              title: '',
              description: '',
              query: { query: '', language: 'lucene' },
            },
          },
        }),
        {}
      );
    });

    it('changes the saved query ID when the query is updated', async () => {
      const { instance, services } = await mountWith({});
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSavedQueryUpdated')!({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          savedQuery: {
            id: '2',
            attributes: {
              title: 'new title',
              description: '',
              query: { query: '', language: 'lucene' },
            },
          },
        }),
        {}
      );
    });

    it('updates the query if saved query is selected', async () => {
      const { instance, services } = await mountWith({});
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSavedQueryUpdated')!({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: 'abc:def', language: 'lucene' },
          },
        });
      });
      expect(services.navigation.ui.TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'abc:def', language: 'lucene' },
        }),
        {}
      );
    });

    it('clears all existing unpinned filters when the active saved query is cleared', async () => {
      const { instance, services, lensStore } = await mountWith({});
      act(() =>
        instance.find(services.navigation.ui.TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
      const unpinned = esFilters.buildExistsFilter(field, indexPattern);
      const pinned = esFilters.buildExistsFilter(pinnedField, indexPattern);
      FilterManager.setFiltersStore([pinned], esFilters.FilterStateStore.GLOBAL_STATE);
      act(() => services.data.query.filterManager.setFilters([pinned, unpinned]));
      instance.update();
      act(() => instance.find(services.navigation.ui.TopNavMenu).prop('onClearSavedQuery')!());
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          filters: [pinned],
        }),
      });
    });
  });

  describe('search session id management', () => {
    it('updates the searchSessionId when the query is updated', async () => {
      const { instance, lensStore, services } = await mountWith({});
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      act(() => {
        instance.find(services.navigation.ui.TopNavMenu).prop('onSavedQueryUpdated')!({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-2`,
        }),
      });
    });

    it('updates the searchSessionId when the active saved query is cleared', async () => {
      const { instance, services, lensStore } = await mountWith({});
      act(() =>
        instance.find(services.navigation.ui.TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
      const unpinned = esFilters.buildExistsFilter(field, indexPattern);
      const pinned = esFilters.buildExistsFilter(pinnedField, indexPattern);
      FilterManager.setFiltersStore([pinned], esFilters.FilterStateStore.GLOBAL_STATE);
      act(() => services.data.query.filterManager.setFilters([pinned, unpinned]));
      instance.update();
      act(() => instance.find(services.navigation.ui.TopNavMenu).prop('onClearSavedQuery')!());
      instance.update();
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-4`,
        }),
      });
    });

    it('updates the state if session id changes from the outside', async () => {
      const services = makeDefaultServices(sessionIdSubject);
      const { lensStore } = await mountWith({ props: undefined, services });

      act(() => {
        sessionIdSubject.next('new-session-id');
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `new-session-id`,
        }),
      });
    });

    it('does not update the searchSessionId when the state changes', async () => {
      const { lensStore } = await mountWith({ preloadedState: { isSaveable: true } });
      expect(lensStore.getState()).toEqual({
        lens: expect.objectContaining({
          searchSessionId: `sessionId-1`,
        }),
      });
    });
  });

  describe('showing a confirm message when leaving', () => {
    let defaultLeave: jest.Mock;
    let confirmLeave: jest.Mock;

    beforeEach(() => {
      defaultLeave = jest.fn();
      confirmLeave = jest.fn();
    });

    it('should not show a confirm message if there is no expression to save', async () => {
      const { props } = await mountWith({});
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('does not confirm if the user is missing save permissions', async () => {
      const services = makeDefaultServices(sessionIdSubject);
      services.application = {
        ...services.application,
        capabilities: {
          ...services.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };
      const { props } = await mountWith({ services, preloadedState: { isSaveable: true } });
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with an unsaved doc', async () => {
      const { props } = await mountWith({
        preloadedState: {
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          isSaveable: true,
        },
      });
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with unsaved changes to an existing doc', async () => {
      const { props } = await mountWith({
        preloadedState: {
          persistedDoc: defaultDoc,
          visualization: {
            activeId: 'testVis',
            state: {},
          },
          isSaveable: true,
        },
      });
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should not confirm when changes are saved', async () => {
      const { props } = await mountWith({
        preloadedState: {
          persistedDoc: {
            ...defaultDoc,
            state: {
              ...defaultDoc.state,
              datasourceStates: { testDatasource: '' },
              visualization: {},
            },
          },
          isSaveable: true,
          ...(defaultDoc.state as Partial<LensAppState>),
          visualization: {
            activeId: 'testVis',
            state: {},
          },
        },
      });
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    // not sure how to test it
    it('should confirm when the latest doc is invalid', async () => {
      const { lensStore, props } = await mountWith({});
      act(() => {
        lensStore.dispatch(
          setState({
            persistedDoc: defaultDoc,
            isSaveable: true,
          })
        );
      });
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });
  });
});
