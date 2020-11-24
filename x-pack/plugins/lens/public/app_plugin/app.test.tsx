/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Observable } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App } from './app';
import { LensAppProps, LensAppServices } from './types';
import { EditorFrameInstance } from '../types';
import { Document } from '../persistence';
import { DOC_TYPE } from '../../common';
import { mount } from 'enzyme';
import { I18nProvider } from '@kbn/i18n/react';
import {
  SavedObjectSaveModal,
  checkForDuplicateTitle,
} from '../../../../../src/plugins/saved_objects/public';
import { createMemoryHistory } from 'history';
import {
  DataPublicPluginStart,
  esFilters,
  FilterManager,
  IFieldType,
  IIndexPattern,
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { navigationPluginMock } from '../../../../../src/plugins/navigation/public/mocks';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { coreMock } from 'src/core/public/mocks';
import {
  LensByValueInput,
  LensSavedObjectAttributes,
  LensByReferenceInput,
} from '../editor_frame_service/embeddable/embeddable';
import { SavedObjectReference } from '../../../../../src/core/types';
import { mockAttributeService } from '../../../../../src/plugins/embeddable/public/mocks';
import { LensAttributeService } from '../lens_attribute_service';
import { KibanaContextProvider } from '../../../../../src/plugins/kibana_react/public';

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

const navigationStartMock = navigationPluginMock.createStartContract();

jest.spyOn(navigationStartMock.ui.TopNavMenu.prototype, 'constructor').mockImplementation(() => {
  return <div className="topNavMenu" />;
});

const { TopNavMenu } = navigationStartMock.ui;

function createMockFrame(): jest.Mocked<EditorFrameInstance> {
  return {
    mount: jest.fn((el, props) => {}),
    unmount: jest.fn(() => {}),
  };
}

function createMockFilterManager() {
  const unsubscribe = jest.fn();

  let subscriber: () => void;
  let filters: unknown = [];

  return {
    getUpdates$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        subscriber = next;
        return unsubscribe;
      },
    }),
    setFilters: jest.fn((newFilters: unknown[]) => {
      filters = newFilters;
      if (subscriber) subscriber();
    }),
    setAppFilters: jest.fn((newFilters: unknown[]) => {
      filters = newFilters;
      if (subscriber) subscriber();
    }),
    getFilters: () => filters,
    getGlobalFilters: () => {
      // @ts-ignore
      return filters.filter(esFilters.isFilterPinned);
    },
    removeAll: () => {
      filters = [];
      subscriber();
    },
  };
}

function createMockQueryString() {
  return {
    getQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
    setQuery: jest.fn(),
    getDefaultQuery: jest.fn(() => ({ query: '', language: 'kuery' })),
  };
}

function createMockTimefilter() {
  const unsubscribe = jest.fn();

  return {
    getTime: jest.fn(() => ({ from: 'now-7d', to: 'now' })),
    setTime: jest.fn(),
    getTimeUpdate$: () => ({
      subscribe: ({ next }: { next: () => void }) => {
        return unsubscribe;
      },
    }),
    getRefreshInterval: () => {},
    getRefreshIntervalDefaults: () => {},
  };
}

describe('Lens App', () => {
  let core: ReturnType<typeof coreMock['createStart']>;
  let defaultDoc: Document;
  let defaultSavedObjectId: string;

  const navMenuItems = {
    expectedSaveButton: { emphasize: true, testId: 'lnsApp_saveButton' },
    expectedSaveAsButton: { emphasize: false, testId: 'lnsApp_saveButton' },
    expectedSaveAndReturnButton: { emphasize: true, testId: 'lnsApp_saveAndReturnButton' },
  };

  function makeAttributeService(): LensAttributeService {
    const attributeServiceMock = mockAttributeService<
      LensSavedObjectAttributes,
      LensByValueInput,
      LensByReferenceInput
    >(
      DOC_TYPE,
      {
        saveMethod: jest.fn(),
        unwrapMethod: jest.fn(),
        checkForDuplicateTitle: jest.fn(),
      },
      core
    );
    attributeServiceMock.unwrapAttributes = jest.fn().mockResolvedValue(defaultDoc);
    attributeServiceMock.wrapAttributes = jest
      .fn()
      .mockResolvedValue({ savedObjectId: defaultSavedObjectId });
    return attributeServiceMock;
  }

  function makeDefaultProps(): jest.Mocked<LensAppProps> {
    return {
      editorFrame: createMockFrame(),
      history: createMemoryHistory(),
      redirectTo: jest.fn(),
      redirectToOrigin: jest.fn(),
      onAppLeave: jest.fn(),
      setHeaderActionMenu: jest.fn(),
    };
  }

  function makeDefaultServices(): jest.Mocked<LensAppServices> {
    return {
      http: core.http,
      chrome: core.chrome,
      overlays: core.overlays,
      uiSettings: core.uiSettings,
      navigation: navigationStartMock,
      notifications: core.notifications,
      attributeService: makeAttributeService(),
      savedObjectsClient: core.savedObjects.client,
      dashboardFeatureFlag: { allowByValueEmbeddables: false },
      getOriginatingAppName: jest.fn(() => 'defaultOriginatingApp'),
      application: {
        ...core.application,
        capabilities: {
          ...core.application.capabilities,
          visualize: { save: true, saveQuery: true, show: true },
        },
        getUrlForApp: jest.fn((appId: string) => `/testbasepath/app/${appId}#/`),
      },
      data: ({
        query: {
          filterManager: createMockFilterManager(),
          timefilter: {
            timefilter: createMockTimefilter(),
          },
          queryString: createMockQueryString(),
          state$: new Observable(),
        },
        indexPatterns: {
          get: jest.fn((id) => {
            return new Promise((resolve) => resolve({ id }));
          }),
        },
      } as unknown) as DataPublicPluginStart,
      storage: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
        clear: jest.fn(),
      },
    };
  }

  function mountWith({
    props: incomingProps,
    services: incomingServices,
  }: {
    props?: jest.Mocked<LensAppProps>;
    services?: jest.Mocked<LensAppServices>;
  }) {
    const props = incomingProps ?? makeDefaultProps();
    const services = incomingServices ?? makeDefaultServices();
    const wrappingComponent: React.FC<{
      children: React.ReactNode;
    }> = ({ children }) => {
      return (
        <I18nProvider>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </I18nProvider>
      );
    };
    const frame = props.editorFrame as ReturnType<typeof createMockFrame>;
    const component = mount(<App {...props} />, { wrappingComponent });
    return { component, frame, props, services };
  }

  beforeEach(() => {
    core = coreMock.createStart({ basePath: '/testbasepath' });
    defaultSavedObjectId = '1234';
    defaultDoc = ({
      savedObjectId: defaultSavedObjectId,
      title: 'An extremely cool default document!',
      expression: 'definitely a valid expression',
      state: {
        query: 'kuery',
        filters: [{ query: { match_phrase: { src: 'test' } } }],
      },
      references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
    } as unknown) as Document;

    core.uiSettings.get.mockImplementation(
      jest.fn((type) => {
        if (type === UI_SETTINGS.TIMEPICKER_TIME_DEFAULTS) {
          return { from: 'now-7d', to: 'now' };
        } else if (type === UI_SETTINGS.SEARCH_QUERY_LANGUAGE) {
          return 'kuery';
        } else if (type === 'state:storeInSessionStorage') {
          return false;
        } else {
          return [];
        }
      })
    );
  });

  it('renders the editor frame', () => {
    const { frame } = mountWith({});

    expect(frame.mount.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <div
            class="lnsApp__frame"
          />,
          Object {
            "dateRange": Object {
              "fromDate": "now-7d",
              "toDate": "now",
            },
            "doc": undefined,
            "filters": Array [],
            "initialContext": undefined,
            "onChange": [Function],
            "onError": [Function],
            "query": Object {
              "language": "kuery",
              "query": "",
            },
            "savedQuery": undefined,
            "showNoDataPopover": [Function],
          },
        ],
      ]
    `);
  });

  it('clears app filters on load', () => {
    const { services } = mountWith({});
    expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([]);
  });

  it('passes global filters to frame', async () => {
    const services = makeDefaultServices();
    const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
    const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
    const pinnedFilter = esFilters.buildExistsFilter(pinnedField, indexPattern);
    services.data.query.filterManager.getFilters = jest.fn().mockImplementation(() => {
      return [];
    });
    services.data.query.filterManager.getGlobalFilters = jest.fn().mockImplementation(() => {
      return [pinnedFilter];
    });
    const { component, frame } = mountWith({ services });

    component.update();

    expect(frame.mount).toHaveBeenCalledWith(
      expect.any(Element),
      expect.objectContaining({
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
        query: { query: '', language: 'kuery' },
        filters: [pinnedFilter],
      })
    );
    expect(services.data.query.filterManager.getFilters).not.toHaveBeenCalled();
  });

  it('displays errors from the frame in a toast', () => {
    const { component, frame, services } = mountWith({});
    const onError = frame.mount.mock.calls[0][1].onError;
    onError({ message: 'error' });
    component.update();
    expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
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
      const { component, services } = mountWith({});

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
        { text: 'Create' },
      ]);

      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(breadcrumbDoc);
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
        { text: 'Daaaaaaadaumching!' },
      ]);
    });

    it('sets originatingApp breadcrumb when the document title changes', async () => {
      const props = makeDefaultProps();
      const services = makeDefaultServices();
      props.incomingState = { originatingApp: 'coolContainer' };
      services.getOriginatingAppName = jest.fn(() => 'The Coolest Container Ever Made');
      const { component } = mountWith({ props, services });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
        { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
        { text: 'Create' },
      ]);

      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue(breadcrumbDoc);
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: breadcrumbDocSavedObjectId } });
      });

      expect(services.chrome.setBreadcrumbs).toHaveBeenCalledWith([
        { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
        { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
        { text: 'Daaaaaaadaumching!' },
      ]);
    });
  });

  describe('persistence', () => {
    it('does not load a document if there is no initial input', () => {
      const { services } = mountWith({});
      expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if initial input is provided', async () => {
      const { component, frame, services } = mountWith({});
      services.attributeService.unwrapAttributes = jest.fn().mockResolvedValue({
        savedObjectId: defaultSavedObjectId,
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      });

      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(services.data.indexPatterns.get).toHaveBeenCalledWith('1');
      expect(services.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
        { query: { match_phrase: { src: 'test' } } },
      ]);
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'fake query',
          indexPatterns: [{ id: '1' }],
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          doc: expect.objectContaining({
            savedObjectId: defaultSavedObjectId,
            state: expect.objectContaining({
              query: 'fake query',
              filters: [{ query: { match_phrase: { src: 'test' } } }],
            }),
          }),
        })
      );
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const { services, component } = mountWith({});

      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);

      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: '5678' } });
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const services = makeDefaultServices();
      services.attributeService.unwrapAttributes = jest.fn().mockRejectedValue('failed to load');
      const { component, props } = mountWith({ services });

      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });

      expect(services.attributeService.unwrapAttributes).toHaveBeenCalledWith({
        savedObjectId: defaultSavedObjectId,
      });
      expect(services.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(props.redirectTo).toHaveBeenCalled();
    });

    it('adds to the recently accessed list on load', async () => {
      const { component, services } = mountWith({});

      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      expect(services.chrome.recentlyAccessed.add).toHaveBeenCalledWith(
        '/app/lens#/edit/1234',
        'An extremely cool default document!',
        '1234'
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
        lastKnownDoc = {
          references: [],
          state: {
            filters: [],
          },
        },
        initialSavedObjectId,
        ...saveProps
      }: SaveProps & {
        lastKnownDoc?: object;
        initialSavedObjectId?: string;
      }) {
        const props = {
          ...makeDefaultProps(),
          initialInput: initialSavedObjectId
            ? { savedObjectId: initialSavedObjectId, id: '5678' }
            : undefined,
        };

        const services = makeDefaultServices();
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

        let frame: jest.Mocked<EditorFrameInstance> = {} as jest.Mocked<EditorFrameInstance>;
        let component: ReactWrapper = {} as ReactWrapper;
        await act(async () => {
          const { frame: newFrame, component: newComponent } = mountWith({ services, props });
          frame = newFrame;
          component = newComponent;
        });

        if (initialSavedObjectId) {
          expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);
        } else {
          expect(services.attributeService.unwrapAttributes).not.toHaveBeenCalled();
        }

        const onChange = frame.mount.mock.calls[0][1].onChange;

        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: { savedObjectId: initialSavedObjectId, ...lastKnownDoc } as Document,
            isSaveable: true,
          })
        );
        component.update();
        expect(getButton(component).disableButton).toEqual(false);
        await act(async () => {
          testSave(component, { ...saveProps });
        });
        return { props, services, component, frame };
      }

      it('shows a disabled save button when the user does not have permissions', async () => {
        const services = makeDefaultServices();
        services.application = {
          ...services.application,
          capabilities: {
            ...services.application.capabilities,
            visualize: { save: false, saveQuery: false, show: true },
          },
        };
        const { component, frame } = mountWith({ services });
        expect(getButton(component).disableButton).toEqual(true);
        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ savedObjectId: 'will save this' } as unknown) as Document,
            isSaveable: true,
          })
        );
        component.update();
        expect(getButton(component).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when the frame has provided its state and does not show save and return or save as', async () => {
        const { component, frame } = mountWith({});
        expect(getButton(component).disableButton).toEqual(true);
        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ savedObjectId: 'will save this' } as unknown) as Document,
            isSaveable: true,
          })
        );
        component.update();
        expect(getButton(component).disableButton).toEqual(false);

        await act(async () => {
          const topNavMenuConfig = component.find(TopNavMenu).prop('config');
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

      it('Shows Save and Return and Save As buttons in create by value mode', async () => {
        const props = makeDefaultProps();
        const services = makeDefaultServices();
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

        const { component } = mountWith({ props, services });

        await act(async () => {
          const topNavMenuConfig = component.find(TopNavMenu).prop('config');
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

        const { component } = mountWith({ props });

        await act(async () => {
          const topNavMenuConfig = component.find(TopNavMenu).prop('config');
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
        const { props, services, component } = await save({
          initialSavedObjectId: defaultSavedObjectId,
          newCopyOnSave: true,
          newTitle: 'hello there',
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
          component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
        });
        expect(services.attributeService.wrapAttributes).toHaveBeenCalledTimes(1);
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
      });

      it('saves existing docs', async () => {
        const { props, services, component } = await save({
          initialSavedObjectId: defaultSavedObjectId,
          newCopyOnSave: false,
          newTitle: 'hello there',
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
          component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
        });
        expect(services.attributeService.unwrapAttributes).toHaveBeenCalledTimes(1);
        expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
          "Saved 'hello there'"
        );
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const services = makeDefaultServices();
        services.attributeService.wrapAttributes = jest
          .fn()
          .mockRejectedValue({ message: 'failed' });
        const { component, props, frame } = mountWith({ services });
        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ id: undefined } as unknown) as Document,
            isSaveable: true,
          })
        );
        component.update();

        await act(async () => {
          testSave(component, { newCopyOnSave: false, newTitle: 'hello there' });
        });
        expect(props.redirectTo).not.toHaveBeenCalled();
        expect(getButton(component).disableButton).toEqual(false);
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
          lastKnownDoc: {
            expression: 'kibana 3',
            state: {
              filters: [pinned, unpinned],
            },
          },
        });
        expect(services.attributeService.wrapAttributes).toHaveBeenCalledWith(
          {
            savedObjectId: defaultSavedObjectId,
            title: 'hello there2',
            expression: 'kibana 3',
            state: {
              filters: [unpinned],
            },
          },
          true,
          { id: '5678', savedObjectId: defaultSavedObjectId }
        );
      });

      it('checks for duplicate title before saving', async () => {
        const services = makeDefaultServices();
        services.attributeService.wrapAttributes = jest
          .fn()
          .mockReturnValue(Promise.resolve({ savedObjectId: '123' }));
        const { component, frame } = mountWith({ services });
        const onChange = frame.mount.mock.calls[0][1].onChange;
        await act(async () =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ savedObjectId: '123' } as unknown) as Document,
            isSaveable: true,
          })
        );
        component.update();
        await act(async () => {
          component.setProps({ initialInput: { savedObjectId: '123' } });
          getButton(component).run(component.getDOMNode());
        });
        component.update();
        const onTitleDuplicate = jest.fn();
        await act(async () => {
          component.find(SavedObjectSaveModal).prop('onSave')({
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
        const { component, frame } = mountWith({});
        const onChange = frame.mount.mock.calls[0][1].onChange;
        await act(async () =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({} as unknown) as Document,
            isSaveable: true,
          })
        );
        component.update();
        await act(async () => getButton(component).run(component.getDOMNode()));
        component.update();
        expect(component.find(SavedObjectSaveModal).prop('showCopyOnSave')).toEqual(false);
      });
    });
  });

  describe('query bar state management', () => {
    it('uses the default time and query language settings', () => {
      const { frame } = mountWith({});
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: '', language: 'kuery' },
          dateRangeFrom: 'now-7d',
          dateRangeTo: 'now',
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          dateRange: { fromDate: 'now-7d', toDate: 'now' },
          query: { query: '', language: 'kuery' },
        })
      );
    });

    it('updates the index patterns when the editor frame is changed', async () => {
      const { component, frame } = mountWith({});
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [],
        }),
        {}
      );
      const onChange = frame.mount.mock.calls[0][1].onChange;
      await act(async () => {
        onChange({
          filterableIndexPatterns: ['1'],
          doc: ({ id: undefined } as unknown) as Document,
          isSaveable: true,
        });
      });
      component.update();
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          indexPatterns: [{ id: '1' }],
        }),
        {}
      );
      // Do it again to verify that the dirty checking is done right
      await act(async () => {
        onChange({
          filterableIndexPatterns: ['2'],
          doc: ({ id: undefined } as unknown) as Document,
          isSaveable: true,
        });
      });
      component.update();
      expect(TopNavMenu).toHaveBeenLastCalledWith(
        expect.objectContaining({
          indexPatterns: [{ id: '2' }],
        }),
        {}
      );
    });

    it('updates the editor frame when the user changes query or time in the search bar', () => {
      const { component, frame } = mountWith({});
      act(() =>
        component.find(TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
      component.update();
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({
          query: { query: 'new', language: 'lucene' },
          dateRangeFrom: 'now-14d',
          dateRangeTo: 'now-7d',
        }),
        {}
      );
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          dateRange: { fromDate: 'now-14d', toDate: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );
    });

    it('updates the filters when the user changes them', () => {
      const { component, frame, services } = mountWith({});
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;
      act(() =>
        services.data.query.filterManager.setFilters([
          esFilters.buildExistsFilter(field, indexPattern),
        ])
      );
      component.update();
      expect(frame.mount).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          filters: [esFilters.buildExistsFilter(field, indexPattern)],
        })
      );
    });
  });

  describe('saved query handling', () => {
    it('does not allow saving when the user is missing the saveQuery permission', () => {
      const services = makeDefaultServices();
      services.application = {
        ...services.application,
        capabilities: {
          ...services.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };
      mountWith({ services });
      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showSaveQuery: false }),
        {}
      );
    });

    it('persists the saved query ID when the query is saved', () => {
      const { component } = mountWith({});
      expect(TopNavMenu).toHaveBeenCalledWith(
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
        component.find(TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      expect(TopNavMenu).toHaveBeenCalledWith(
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

    it('changes the saved query ID when the query is updated', () => {
      const { component } = mountWith({});
      act(() => {
        component.find(TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      act(() => {
        component.find(TopNavMenu).prop('onSavedQueryUpdated')!({
          id: '2',
          attributes: {
            title: 'new title',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });
      expect(TopNavMenu).toHaveBeenCalledWith(
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

    it('clears all existing unpinned filters when the active saved query is cleared', () => {
      const { component, frame, services } = mountWith({});
      act(() =>
        component.find(TopNavMenu).prop('onQuerySubmit')!({
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
      component.update();
      act(() => component.find(TopNavMenu).prop('onClearSavedQuery')!());
      component.update();
      expect(frame.mount).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          filters: [pinned],
        })
      );
    });
  });

  describe('showing a confirm message when leaving', () => {
    let defaultLeave: jest.Mock;
    let confirmLeave: jest.Mock;

    beforeEach(() => {
      defaultLeave = jest.fn();
      confirmLeave = jest.fn();
    });

    it('should not show a confirm message if there is no expression to save', () => {
      const { props } = mountWith({});
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('does not confirm if the user is missing save permissions', () => {
      const services = makeDefaultServices();
      services.application = {
        ...services.application,
        capabilities: {
          ...services.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };
      const { component, frame, props } = mountWith({ services });
      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({
            savedObjectId: undefined,
            references: [],
          } as unknown) as Document,
          isSaveable: true,
        })
      );
      component.update();
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with an unsaved doc', () => {
      const { component, frame, props } = mountWith({});
      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({ savedObjectId: undefined, state: {} } as unknown) as Document,
          isSaveable: true,
        })
      );
      component.update();
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with unsaved changes to an existing doc', async () => {
      const { component, frame, props } = mountWith({});
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({
            savedObjectId: defaultSavedObjectId,
            references: [],
          } as unknown) as Document,
          isSaveable: true,
        })
      );
      component.update();
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should not confirm when changes are saved', async () => {
      const { component, frame, props } = mountWith({});
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: defaultDoc,
          isSaveable: true,
        })
      );
      component.update();
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when the latest doc is invalid', async () => {
      const { component, frame, props } = mountWith({});
      await act(async () => {
        component.setProps({ initialInput: { savedObjectId: defaultSavedObjectId } });
      });
      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({ savedObjectId: defaultSavedObjectId, references: [] } as unknown) as Document,
          isSaveable: true,
        })
      );
      component.update();
      const lastCall = props.onAppLeave.mock.calls[props.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });
      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });
  });
});
