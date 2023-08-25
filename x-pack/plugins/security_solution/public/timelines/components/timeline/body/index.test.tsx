/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Store } from 'redux';
import { mount } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { useKibana, useCurrentUser } from '../../../../common/lib/kibana';
import { DefaultCellRenderer } from '../cell_rendering/default_cell_renderer';
import '../../../../common/mock/match_media';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { Direction } from '../../../../../common/search_strategy';
import {
  createSecuritySolutionStorageMock,
  defaultHeaders,
  kibanaObservable,
  mockGlobalState,
  mockTimelineData,
  SUB_PLUGINS_REDUCER,
} from '../../../../common/mock';
import { TestProviders } from '../../../../common/mock/test_providers';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';

import type { Props } from '.';
import { StatefulBody } from '.';
import type { Sort } from './sort';
import { getDefaultControlColumn } from './control_columns';
import { timelineActions } from '../../../store/timeline';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { defaultRowRenderers } from './renderers';
import type { State } from '../../../../common/store';
import { createStore } from '../../../../common/store';
import type { UseFieldBrowserOptionsProps } from '../../fields_browser';
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DroppableStateSnapshot,
} from '@hello-pangea/dnd';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions'
);

jest.mock('../../../../common/hooks/use_upselling', () => ({
  useUpsellingMessage: jest.fn(),
}));

jest.mock('../../../../common/components/user_privileges', () => {
  return {
    useUserPrivileges: () => ({
      listPrivileges: { loading: false, error: undefined, result: undefined },
      detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
      endpointPrivileges: {},
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
    }),
  };
});

const mockUseFieldBrowserOptions = jest.fn();
const mockUseKibana = useKibana as jest.Mock;
const mockUseCurrentUser = useCurrentUser as jest.Mock<Partial<ReturnType<typeof useCurrentUser>>>;
const mockCasesContract = jest.requireActual('@kbn/cases-plugin/public/mocks');
jest.mock('../../fields_browser', () => ({
  useFieldBrowserOptions: (props: UseFieldBrowserOptionsProps) => mockUseFieldBrowserOptions(props),
}));

const useAddToTimeline = () => ({
  beginDrag: jest.fn(),
  cancelDrag: jest.fn(),
  dragToLocation: jest.fn(),
  endDrag: jest.fn(),
  hasDraggableLock: jest.fn(),
  startDragToTimeline: jest.fn(),
});

jest.mock('../../../../common/lib/kibana');
const mockSort: Sort[] = [
  {
    columnId: '@timestamp',
    columnType: 'date',
    esTypes: ['date'],
    sortDirection: Direction.desc,
  },
];

const mockDispatch = jest.fn();
jest.mock('react-redux', () => {
  const original = jest.requireActual('react-redux');

  return {
    ...original,
    useDispatch: () => mockDispatch,
  };
});

jest.mock('../../../../common/components/link_to', () => {
  const originalModule = jest.requireActual('../../../../common/components/link_to');
  return {
    ...originalModule,
    useGetSecuritySolutionUrl: () =>
      jest.fn(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`),
    useNavigateTo: () => {
      return { navigateTo: jest.fn() };
    },
    useAppUrl: () => {
      return { getAppUrl: jest.fn() };
    },
  };
});

jest.mock('../../../../common/components/links', () => {
  const originalModule = jest.requireActual('../../../../common/components/links');
  return {
    ...originalModule,
    useGetSecuritySolutionUrl: () =>
      jest.fn(({ deepLinkId }: { deepLinkId: string }) => `/${deepLinkId}`),
    useNavigateTo: () => {
      return { navigateTo: jest.fn() };
    },
    useAppUrl: () => {
      return { getAppUrl: jest.fn() };
    },
  };
});

jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_open_alert_details',
  () => {
    return {
      useOpenAlertDetailsAction: () => {
        return {
          alertDetailsActionItems: [],
        };
      },
    };
  }
);

// Prevent Resolver from rendering
jest.mock('../../graph_overlay');

jest.mock('../../fields_browser/create_field_button', () => ({
  useCreateFieldButton: () => <></>,
}));

jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    EuiScreenReaderOnly: () => <></>,
  };
});
jest.mock('suricata-sid-db', () => {
  return {
    db: [],
  };
});
jest.mock(
  '../../../../detections/components/alerts_table/timeline_actions/use_add_to_case_actions',
  () => {
    return {
      useAddToCaseActions: () => {
        return {
          addToCaseActionItems: [],
        };
      },
    };
  }
);

jest.mock('@hello-pangea/dnd', () => ({
  Droppable: ({
    children,
  }: {
    children: (a: DroppableProvided, b: DroppableStateSnapshot) => void;
  }) =>
    children(
      {
        droppableProps: {
          'data-rfd-droppable-context-id': '123',
          'data-rfd-droppable-id': '123',
        },
        innerRef: jest.fn(),
        placeholder: null,
      },
      {
        isDraggingOver: false,
        draggingOverWith: null,
        draggingFromThisWith: null,
        isUsingPlaceholder: false,
      }
    ),
  Draggable: ({
    children,
  }: {
    children: (a: DraggableProvided, b: DraggableStateSnapshot) => void;
  }) =>
    children(
      {
        draggableProps: {
          'data-rfd-draggable-context-id': '123',
          'data-rfd-draggable-id': '123',
        },
        innerRef: jest.fn(),
        dragHandleProps: null,
      },
      {
        isDragging: false,
        isDropAnimating: false,
        isClone: false,
        dropAnimation: null,
        draggingOver: null,
        combineWith: null,
        combineTargetFor: null,
        mode: null,
      }
    ),
  DragDropContext: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Body', () => {
  const getWrapper = async (childrenComponent: JSX.Element, store?: { store: Store<State> }) => {
    const wrapper = mount(childrenComponent, {
      wrappingComponent: TestProviders,
      wrappingComponentProps: store ?? {},
    });
    await waitFor(() => wrapper.find('[data-test-subj="suricataRefs"]').exists());

    return wrapper;
  };
  const mockRefetch = jest.fn();
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    mockUseCurrentUser.mockReturnValue({ username: 'test-username' });
    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: jest.fn(),
          getUrlForApp: jest.fn(),
          capabilities: {
            siem: { crud_alerts: true, read_alerts: true },
          },
        },
        cases: mockCasesContract.mockCasesContract(),
        data: {
          search: jest.fn(),
          query: jest.fn(),
          dataViews: jest.fn(),
        },
        uiSettings: {
          get: jest.fn(),
        },
        savedObjects: {
          client: {},
        },
        timelines: {
          getLastUpdated: jest.fn(),
          getLoadingPanel: jest.fn(),
          getFieldBrowser: jest.fn(),
          getUseAddToTimeline: () => useAddToTimeline,
        },
      },
      useNavigateTo: jest.fn().mockReturnValue({
        navigateTo: jest.fn(),
      }),
    });
    appToastsMock = useAppToastsMock.create();
    (useAppToasts as jest.Mock).mockReturnValue(appToastsMock);
  });

  const ACTION_BUTTON_COUNT = 4;

  const props: Props = {
    activePage: 0,
    browserFields: mockBrowserFields,
    data: [mockTimelineData[0]],
    id: TimelineId.test,
    refetch: mockRefetch,
    renderCellValue: DefaultCellRenderer,
    rowRenderers: defaultRowRenderers,
    sort: mockSort,
    tabType: TimelineTabs.query,
    totalPages: 1,
    leadingControlColumns: getDefaultControlColumn(ACTION_BUTTON_COUNT),
    trailingControlColumns: [],
  };

  describe('rendering', () => {
    beforeEach(() => {
      mockDispatch.mockClear();
    });

    test('it renders the column headers', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);
      expect(wrapper.find('[data-test-subj="column-headers"]').first().exists()).toEqual(true);
    });

    test('it renders the scroll container', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);
      expect(wrapper.find('[data-test-subj="timeline-body"]').first().exists()).toEqual(true);
    });

    test('it renders events', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);
      expect(wrapper.find('[data-test-subj="events"]').first().exists()).toEqual(true);
    });
    test('it renders a tooltip for timestamp', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const headersJustTimestamp = defaultHeaders.filter((h) => h.id === '@timestamp');
      const state: State = {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
            ...mockGlobalState.timeline.timelineById,
            [TimelineId.test]: {
              ...mockGlobalState.timeline.timelineById[TimelineId.test],
              id: TimelineId.test,
              columns: headersJustTimestamp,
            },
          },
        },
      };

      const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
      const wrapper = await getWrapper(<StatefulBody {...props} />, { store });

      headersJustTimestamp.forEach(() => {
        expect(
          wrapper
            .find('[data-test-subj="data-driven-columns"]')
            .first()
            .find('[data-test-subj="localized-date-tool-tip"]')
            .exists()
        ).toEqual(true);
      });
    });
  });
  describe('action on event', () => {
    const addaNoteToEvent = (wrapper: ReturnType<typeof mount>, note: string) => {
      wrapper.find('[data-test-subj="add-note"]').first().find('button').simulate('click');
      wrapper.update();
      wrapper
        .find('[data-test-subj="new-note-tabs"] textarea')
        .simulate('change', { target: { value: note } });
      wrapper.update();
      wrapper.find('button[data-test-subj="add-note"]').first().simulate('click');
      wrapper.update();
    };

    beforeEach(() => {
      mockDispatch.mockClear();
    });

    test('Add a note to an event', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);

      addaNoteToEvent(wrapper, 'hello world');
      wrapper.update();
      expect(mockDispatch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          payload: {
            eventId: '1',
            id: 'timeline-test',
            noteId: expect.anything(),
          },
          type: timelineActions.addNoteToEvent({
            eventId: '1',
            id: 'timeline-test',
            noteId: '11',
          }).type,
        })
      );
      expect(mockDispatch).toHaveBeenNthCalledWith(
        3,
        timelineActions.pinEvent({
          eventId: '1',
          id: 'timeline-test',
        })
      );
    });

    test('Add two notes to an event', async () => {
      const { storage } = createSecuritySolutionStorageMock();
      const state: State = {
        ...mockGlobalState,
        timeline: {
          ...mockGlobalState.timeline,
          timelineById: {
            ...mockGlobalState.timeline.timelineById,
            [TimelineId.test]: {
              ...mockGlobalState.timeline.timelineById[TimelineId.test],
              id: 'timeline-test',
              pinnedEventIds: { 1: true }, // we should NOT dispatch a pin event, because it's already pinned
            },
          },
        },
      };

      const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);

      const Proxy = (proxyProps: Props) => <StatefulBody {...proxyProps} />;

      const wrapper = await getWrapper(<Proxy {...props} />, { store });

      addaNoteToEvent(wrapper, 'hello world');
      mockDispatch.mockClear();
      addaNoteToEvent(wrapper, 'new hello world');
      expect(mockDispatch).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          payload: {
            eventId: '1',
            id: 'timeline-test',
            noteId: expect.anything(),
          },
          type: timelineActions.addNoteToEvent({
            eventId: '1',
            id: 'timeline-test',
            noteId: '11',
          }).type,
        })
      );

      expect(mockDispatch).not.toHaveBeenCalledWith(
        timelineActions.pinEvent({
          eventId: '1',
          id: 'timeline-test',
        })
      );
    });
  });

  describe('event details', () => {
    beforeEach(() => {
      mockDispatch.mockReset();
    });
    test('call the right reduce action to show event details for query tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).toBeCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        payload: {
          id: 'timeline-test',
          panelView: 'eventDetail',
          params: {
            eventId: '1',
            indexName: undefined,
            refetch: mockRefetch,
          },
          tabType: 'query',
        },
        type: 'x-pack/security_solution/local/timeline/TOGGLE_DETAIL_PANEL',
      });
    });

    test('call the right reduce action to show event details for pinned tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} tabType={TimelineTabs.pinned} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).toBeCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        payload: {
          id: 'timeline-test',
          panelView: 'eventDetail',
          params: {
            eventId: '1',
            indexName: undefined,
            refetch: mockRefetch,
          },
          tabType: 'pinned',
        },
        type: 'x-pack/security_solution/local/timeline/TOGGLE_DETAIL_PANEL',
      });
    });

    test('call the right reduce action to show event details for notes tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} tabType={TimelineTabs.notes} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).toBeCalledTimes(1);
      expect(mockDispatch.mock.calls[0][0]).toEqual({
        payload: {
          id: 'timeline-test',
          panelView: 'eventDetail',
          params: {
            eventId: '1',
            indexName: undefined,
            refetch: mockRefetch,
          },
          tabType: 'notes',
        },
        type: 'x-pack/security_solution/local/timeline/TOGGLE_DETAIL_PANEL',
      });
    });
  });
});
