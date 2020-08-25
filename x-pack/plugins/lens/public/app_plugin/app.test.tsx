/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Observable } from 'rxjs';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { App, LensAppProps } from './app';
import { EditorFrameInstance } from '../types';
import { Document } from '../persistence';
import { mount } from 'enzyme';
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
  UI_SETTINGS,
} from '../../../../../src/plugins/data/public';
import { navigationPluginMock } from '../../../../../src/plugins/navigation/public/mocks';
import { TopNavMenuData } from '../../../../../src/plugins/navigation/public';
import { coreMock } from 'src/core/public/mocks';
import { Optional } from '@kbn/utility-types';
import { LensEmbeddableInput } from '../editor_frame_service/embeddable/embeddable';

jest.mock('../editor_frame_service/editor_frame/expression_helpers');
jest.mock('src/core/public');
jest.mock('../../../../../src/plugins/saved_objects/public', () => {
  // eslint-disable-next-line no-shadow
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
  let frame: jest.Mocked<EditorFrameInstance>;
  let core: ReturnType<typeof coreMock['createStart']>;
  let instance: ReactWrapper;

  const navMenuItems = {
    expectedSaveButton: { emphasize: true, testId: 'lnsApp_saveButton' },
    expectedSaveAsButton: { emphasize: false, testId: 'lnsApp_saveButton' },
    expectedSaveAndReturnButton: { emphasize: true, testId: 'lnsApp_saveAndReturnButton' },
  };

  function makeDefaultArgs(): jest.Mocked<LensAppProps> {
    return ({
      navigation: navigationStartMock,
      editorFrame: createMockFrame(),
      core: {
        ...core,
        application: {
          ...core.application,
          capabilities: {
            ...core.application.capabilities,
            visualize: { save: true, saveQuery: true, show: true },
          },
        },
      },
      data: {
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
      },
      storage: {
        get: jest.fn(),
      },
      docStorage: {
        load: jest.fn(),
        save: jest.fn(),
      },
      redirectTo: jest.fn((savedObjectId?: string) => {}),
      redirectToOrigin: jest.fn((input?: Optional<LensEmbeddableInput, 'id'>) => {}),
      onAppLeave: jest.fn(),
      history: createMemoryHistory(),
      featureFlagConfig: { allowByValueEmbeddables: false },
    } as unknown) as jest.Mocked<LensAppProps>;
  }

  beforeEach(() => {
    frame = createMockFrame();
    core = coreMock.createStart({ basePath: '/testbasepath' });

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
    const args = makeDefaultArgs();
    args.editorFrame = frame;

    mount(<App {...args} />);

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
    const defaultArgs = makeDefaultArgs();
    mount(<App {...defaultArgs} />);

    expect(defaultArgs.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([]);
  });

  it('passes global filters to frame', async () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;
    const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
    const pinnedField = ({ name: 'pinnedField' } as unknown) as IFieldType;
    const pinnedFilter = esFilters.buildExistsFilter(pinnedField, indexPattern);
    args.data.query.filterManager.getFilters = jest.fn().mockImplementation(() => {
      return [pinnedFilter];
    });
    const component = mount(<App {...args} />);
    component.update();
    expect(frame.mount).toHaveBeenCalledWith(
      expect.any(Element),
      expect.objectContaining({
        dateRange: { fromDate: 'now-7d', toDate: 'now' },
        query: { query: '', language: 'kuery' },
        filters: [pinnedFilter],
      })
    );
  });

  it('Renders save button in by reference mode without originatingApp', async () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;

    instance = mount(<App {...args} />);

    await act(async () => {
      const topNavMenuConfig = instance.find(TopNavMenu).prop('config');
      expect(topNavMenuConfig).toContainEqual(
        expect.objectContaining(navMenuItems.expectedSaveButton)
      );
      expect(topNavMenuConfig).not.toContainEqual(
        expect.objectContaining(navMenuItems.expectedSaveAsButton)
      );
      expect(topNavMenuConfig).not.toContainEqual(
        expect.objectContaining(navMenuItems.expectedSaveAndReturnButton)
      );
    });
  });

  it('Renders Save and Return and Save As in by reference mode when originatingApp is provided', async () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;
    args.embeddableEditorIncomingState = { originatingApp: 'ultraDashboard' };
    args.savedObjectId = 'wowASavedObject';
    (args.docStorage.load as jest.Mock).mockResolvedValue({ id: '1234' });

    instance = mount(<App {...args} />);

    await act(async () => {
      const topNavMenuConfig = instance.find(TopNavMenu).prop('config');
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

  it('Renders Save and Return and Save As in create by value mode', async () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;
    args.featureFlagConfig = { allowByValueEmbeddables: true };
    args.embeddableEditorIncomingState = {
      originatingApp: 'ultraDashboard',
      valueInput: {
        id: 'whatchaGonnaDoWith',
        attributes: {
          allTheseReferences: 'all these references in your value Input',
          references: [],
        },
      },
    };

    instance = mount(<App {...args} />);

    await act(async () => {
      const topNavMenuConfig = instance.find(TopNavMenu).prop('config');
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

  it('sets breadcrumbs when the document title changes', async () => {
    const defaultArgs = makeDefaultArgs();
    instance = mount(<App {...defaultArgs} />);

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
      { text: 'Create' },
    ]);

    (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
      id: '1234',
      title: 'Daaaaaaadaumching!',
      state: {
        query: 'fake query',
        filters: [],
      },
      references: [],
    });
    await act(async () => {
      instance.setProps({ savedObjectId: '1234' });
    });

    expect(defaultArgs.core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
      { text: 'Daaaaaaadaumching!' },
    ]);
  });

  it('sets originatingApp breadcrumb when the document title changes', async () => {
    const defaultArgs = makeDefaultArgs();
    defaultArgs.embeddableEditorIncomingState = { originatingApp: 'ultraCoolDashboard' };
    defaultArgs.getAppNameFromId = () => 'The Coolest Container Ever Made';
    instance = mount(<App {...defaultArgs} />);

    expect(core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
      { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
      { text: 'Create' },
    ]);

    (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
      id: '1234',
      title: 'Daaaaaaadaumching!',
      state: {
        query: 'fake query',
        filters: [],
      },
      references: [],
    });
    await act(async () => {
      instance.setProps({ savedObjectId: '1234' });
    });

    expect(defaultArgs.core.chrome.setBreadcrumbs).toHaveBeenCalledWith([
      { text: 'The Coolest Container Ever Made', onClick: expect.anything() },
      { text: 'Visualize', href: '/testbasepath/app/visualize#/', onClick: expect.anything() },
      { text: 'Daaaaaaadaumching!' },
    ]);
  });

  describe('persistence', () => {
    it('does not load a document if there is no document id', () => {
      const args = makeDefaultArgs();

      mount(<App {...args} />);

      expect(args.docStorage.load).not.toHaveBeenCalled();
    });

    it('loads a document and uses query and filters if there is a document id', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockResolvedValue({
        id: '1234',
        state: {
          query: 'fake query',
          filters: [{ query: { match_phrase: { src: 'test' } } }],
        },
        references: [{ type: 'index-pattern', id: '1', name: 'index-pattern-0' }],
      });

      instance = mount(<App {...args} />);

      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(args.data.indexPatterns.get).toHaveBeenCalledWith('1');
      expect(args.data.query.filterManager.setAppFilters).toHaveBeenCalledWith([
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
            id: '1234',
            state: expect.objectContaining({
              query: 'fake query',
              filters: [{ query: { match_phrase: { src: 'test' } } }],
            }),
          }),
        })
      );
    });

    it('does not load documents on sequential renders unless the id changes', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockResolvedValue({ id: '1234' });

      instance = mount(<App {...args} />);
      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      expect(args.docStorage.load).toHaveBeenCalledTimes(1);

      await act(async () => {
        instance.setProps({ savedObjectId: '9876' });
      });

      expect(args.docStorage.load).toHaveBeenCalledTimes(2);
    });

    it('handles document load errors', async () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;
      (args.docStorage.load as jest.Mock).mockRejectedValue('failed to load');

      instance = mount(<App {...args} />);

      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      expect(args.docStorage.load).toHaveBeenCalledWith('1234');
      expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
      expect(args.redirectTo).toHaveBeenCalled();
    });

    describe('save button', () => {
      interface SaveProps {
        newCopyOnSave: boolean;
        returnToOrigin?: boolean;
        newTitle: string;
      }

      let defaultArgs: ReturnType<typeof makeDefaultArgs>;

      beforeEach(() => {
        defaultArgs = makeDefaultArgs();
        (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
          id: '1234',
          title: 'My cool doc',
          expression: 'valid expression',
          state: {
            query: 'kuery',
          },
        } as jest.ResolvedValue<Document>);
      });

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
        const handler = inst.find('[data-test-subj="lnsApp_saveModalOrigin"]').prop('onSave') as (
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
        initialDocId,
        ...saveProps
      }: SaveProps & {
        lastKnownDoc?: object;
        initialDocId?: string;
      }) {
        const args = {
          ...defaultArgs,
          savedObjectId: initialDocId,
        };
        args.editorFrame = frame;
        (args.docStorage.load as jest.Mock).mockResolvedValue({
          id: '1234',
          references: [],
          state: {
            query: 'fake query',
            filters: [],
          },
        });
        (args.docStorage.save as jest.Mock).mockImplementation(async ({ savedObjectId }) => ({
          savedObjectId: savedObjectId || 'aaa',
        }));

        await act(async () => {
          instance = mount(<App {...args} />);
        });

        if (initialDocId) {
          expect(args.docStorage.load).toHaveBeenCalledTimes(1);
        } else {
          expect(args.docStorage.load).not.toHaveBeenCalled();
        }

        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: { savedObjectId: initialDocId, ...lastKnownDoc } as Document,
            isSaveable: true,
          })
        );

        instance.update();

        expect(getButton(instance).disableButton).toEqual(false);

        await act(async () => {
          testSave(instance, { ...saveProps });
        });

        return { args, instance };
      }

      it('shows a disabled save button when the user does not have permissions', async () => {
        const args = defaultArgs;
        args.core.application = {
          ...args.core.application,
          capabilities: {
            ...args.core.application.capabilities,
            visualize: { save: false, saveQuery: false, show: true },
          },
        };
        args.editorFrame = frame;

        instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ id: 'will save this' } as unknown) as Document,
            isSaveable: true,
          })
        );
        instance.update();
        expect(getButton(instance).disableButton).toEqual(true);
      });

      it('shows a save button that is enabled when the frame has provided its state', async () => {
        const args = defaultArgs;
        args.editorFrame = frame;

        instance = mount(<App {...args} />);

        expect(getButton(instance).disableButton).toEqual(true);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ id: 'will save this' } as unknown) as Document,
            isSaveable: true,
          })
        );
        instance.update();

        expect(getButton(instance).disableButton).toEqual(false);
      });

      it('saves new docs', async () => {
        const { args, instance: inst } = await save({
          initialDocId: undefined,
          newCopyOnSave: false,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            savedObjectId: undefined,
            title: 'hello there',
          })
        );

        expect(args.redirectTo).toHaveBeenCalledWith('aaa');

        inst.setProps({ savedObjectId: 'aaa' });

        expect(args.docStorage.load).not.toHaveBeenCalled();
      });

      it('saves the latest doc as a copy', async () => {
        const { args, instance: inst } = await save({
          initialDocId: '1234',
          newCopyOnSave: true,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            savedObjectId: undefined,
            title: 'hello there',
          })
        );

        expect(args.redirectTo).toHaveBeenCalledWith('aaa');

        inst.setProps({ savedObjectId: 'aaa' });

        expect(args.docStorage.load).toHaveBeenCalledTimes(1);
      });

      it('saves existing docs', async () => {
        const { args, instance: inst } = await save({
          initialDocId: '1234',
          newCopyOnSave: false,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            savedObjectId: '1234',
            title: 'hello there',
          })
        );

        expect(args.redirectTo).not.toHaveBeenCalled();

        inst.setProps({ savedObjectId: '1234' });

        expect(args.docStorage.load).toHaveBeenCalledTimes(1);
      });

      it('handles save failure by showing a warning, but still allows another save', async () => {
        const args = defaultArgs;
        args.editorFrame = frame;
        (args.docStorage.save as jest.Mock).mockRejectedValue({ message: 'failed' });

        instance = mount(<App {...args} />);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        act(() =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ id: undefined } as unknown) as Document,
            isSaveable: true,
          })
        );

        instance.update();

        await act(async () => {
          testSave(instance, { newCopyOnSave: false, newTitle: 'hello there' });
        });

        expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
        expect(args.redirectTo).not.toHaveBeenCalled();

        expect(getButton(instance).disableButton).toEqual(false);
      });

      it('saves new doc and redirects to originating app', async () => {
        const { args } = await save({
          initialDocId: undefined,
          returnToOrigin: true,
          newCopyOnSave: false,
          newTitle: 'hello there',
        });

        expect(args.docStorage.save).toHaveBeenCalledWith(
          expect.objectContaining({
            savedObjectId: undefined,
            title: 'hello there',
          })
        );

        expect(args.redirectToOrigin).toHaveBeenCalledWith({ savedObjectId: 'aaa' });
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

        const { args } = await save({
          initialDocId: '1234',
          newCopyOnSave: false,
          newTitle: 'hello there2',
          lastKnownDoc: {
            expression: 'kibana 3',
            state: {
              filters: [pinned, unpinned],
            },
          },
        });

        expect(args.docStorage.save).toHaveBeenCalledWith({
          savedObjectId: '1234',
          title: 'hello there2',
          expression: 'kibana 3',
          state: {
            filters: [unpinned],
          },
        });
      });

      it('checks for duplicate title before saving', async () => {
        const args = defaultArgs;
        args.editorFrame = frame;
        (args.docStorage.save as jest.Mock).mockReturnValue(Promise.resolve({ id: '123' }));

        instance = mount(<App {...args} />);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        await act(async () =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({ id: '123' } as unknown) as Document,
            isSaveable: true,
          })
        );
        instance.update();
        await act(async () => {
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
        const args = defaultArgs;
        args.editorFrame = frame;

        instance = mount(<App {...args} />);

        const onChange = frame.mount.mock.calls[0][1].onChange;
        await act(async () =>
          onChange({
            filterableIndexPatterns: [],
            doc: ({} as unknown) as Document,
            isSaveable: true,
          })
        );
        instance.update();
        await act(async () => getButton(instance).run(instance.getDOMNode()));
        instance.update();

        expect(instance.find(SavedObjectSaveModal).prop('showCopyOnSave')).toEqual(false);
      });
    });
  });

  describe('query bar state management', () => {
    let defaultArgs: ReturnType<typeof makeDefaultArgs>;

    beforeEach(() => {
      defaultArgs = makeDefaultArgs();
      (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
        id: '1234',
        title: 'My cool doc',
        expression: 'valid expression',
        state: {
          query: 'kuery',
        },
      } as jest.ResolvedValue<Document>);
    });

    it('uses the default time and query language settings', () => {
      const args = defaultArgs;
      args.editorFrame = frame;

      mount(<App {...args} />);

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
      const args = defaultArgs;
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

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

      instance.update();

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

      instance.update();

      expect(TopNavMenu).toHaveBeenLastCalledWith(
        expect.objectContaining({
          indexPatterns: [{ id: '2' }],
        }),
        {}
      );
    });
    it('updates the editor frame when the user changes query or time in the search bar', () => {
      const args = defaultArgs;
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

      act(() =>
        instance.find(TopNavMenu).prop('onQuerySubmit')!({
          dateRange: { from: 'now-14d', to: 'now-7d' },
          query: { query: 'new', language: 'lucene' },
        })
      );

      instance.update();

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
      const args = defaultArgs;
      args.editorFrame = frame;

      instance = mount(<App {...args} />);
      const indexPattern = ({ id: 'index1' } as unknown) as IIndexPattern;
      const field = ({ name: 'myfield' } as unknown) as IFieldType;

      act(() =>
        args.data.query.filterManager.setFilters([esFilters.buildExistsFilter(field, indexPattern)])
      );

      instance.update();

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
      const args = makeDefaultArgs();
      args.core.application = {
        ...args.core.application,
        capabilities: {
          ...args.core.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };

      mount(<App {...args} />);

      expect(TopNavMenu).toHaveBeenCalledWith(
        expect.objectContaining({ showSaveQuery: false }),
        {}
      );
    });

    it('persists the saved query ID when the query is saved', () => {
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

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
        instance.find(TopNavMenu).prop('onSaved')!({
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
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

      act(() => {
        instance.find(TopNavMenu).prop('onSaved')!({
          id: '1',
          attributes: {
            title: '',
            description: '',
            query: { query: '', language: 'lucene' },
          },
        });
      });

      act(() => {
        instance.find(TopNavMenu).prop('onSavedQueryUpdated')!({
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
      const args = makeDefaultArgs();
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

      act(() =>
        instance.find(TopNavMenu).prop('onQuerySubmit')!({
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

      act(() => args.data.query.filterManager.setFilters([pinned, unpinned]));
      instance.update();

      act(() => instance.find(TopNavMenu).prop('onClearSavedQuery')!());
      instance.update();

      expect(frame.mount).toHaveBeenLastCalledWith(
        expect.any(Element),
        expect.objectContaining({
          filters: [pinned],
        })
      );
    });
  });

  it('displays errors from the frame in a toast', () => {
    const args = makeDefaultArgs();
    args.editorFrame = frame;

    instance = mount(<App {...args} />);

    const onError = frame.mount.mock.calls[0][1].onError;
    onError({ message: 'error' });

    instance.update();

    expect(args.core.notifications.toasts.addDanger).toHaveBeenCalled();
  });

  describe('showing a confirm message when leaving', () => {
    let defaultArgs: ReturnType<typeof makeDefaultArgs>;
    let defaultLeave: jest.Mock;
    let confirmLeave: jest.Mock;

    beforeEach(() => {
      defaultArgs = makeDefaultArgs();
      defaultLeave = jest.fn();
      confirmLeave = jest.fn();
      (defaultArgs.docStorage.load as jest.Mock).mockResolvedValue({
        id: '1234',
        title: 'My cool doc',
        state: {
          query: 'kuery',
          filters: [],
        },
        references: [],
      } as jest.ResolvedValue<Document>);
    });

    it('should not show a confirm message if there is no expression to save', () => {
      instance = mount(<App {...defaultArgs} />);

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('does not confirm if the user is missing save permissions', () => {
      const args = defaultArgs;
      args.core.application = {
        ...args.core.application,
        capabilities: {
          ...args.core.application.capabilities,
          visualize: { save: false, saveQuery: false, show: true },
        },
      };
      args.editorFrame = frame;

      instance = mount(<App {...args} />);

      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({
            id: undefined,

            references: [],
          } as unknown) as Document,
          isSaveable: true,
        })
      );
      instance.update();

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with an unsaved doc', () => {
      defaultArgs.editorFrame = frame;
      instance = mount(<App {...defaultArgs} />);

      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({ id: undefined, state: {} } as unknown) as Document,
          isSaveable: true,
        })
      );
      instance.update();

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should confirm when leaving with unsaved changes to an existing doc', async () => {
      defaultArgs.editorFrame = frame;
      instance = mount(<App {...defaultArgs} />);
      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({
            id: '1234',

            references: [],
          } as unknown) as Document,
          isSaveable: true,
        })
      );
      instance.update();

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });

    it('should not confirm when changes are saved', async () => {
      defaultArgs.editorFrame = frame;
      instance = mount(<App {...defaultArgs} />);
      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({
            id: '1234',
            title: 'My cool doc',
            references: [],
            state: {
              query: 'kuery',
              filters: [],
            },
          } as unknown) as Document,
          isSaveable: true,
        })
      );
      instance.update();

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(defaultLeave).toHaveBeenCalled();
      expect(confirmLeave).not.toHaveBeenCalled();
    });

    it('should confirm when the latest doc is invalid', async () => {
      defaultArgs.editorFrame = frame;
      instance = mount(<App {...defaultArgs} />);
      await act(async () => {
        instance.setProps({ savedObjectId: '1234' });
      });

      const onChange = frame.mount.mock.calls[0][1].onChange;
      act(() =>
        onChange({
          filterableIndexPatterns: [],
          doc: ({ id: '1234', references: [] } as unknown) as Document,
          isSaveable: true,
        })
      );
      instance.update();

      const lastCall =
        defaultArgs.onAppLeave.mock.calls[defaultArgs.onAppLeave.mock.calls.length - 1][0];
      lastCall({ default: defaultLeave, confirm: confirmLeave });

      expect(confirmLeave).toHaveBeenCalled();
      expect(defaultLeave).not.toHaveBeenCalled();
    });
  });
});
