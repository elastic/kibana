/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { mount, type ComponentType as EnzymeComponentType } from 'enzyme';
import { waitFor } from '@testing-library/react';

import { useKibana, useCurrentUser } from '../../../../common/lib/kibana';
import { DefaultCellRenderer } from '../cell_rendering/default_cell_renderer';
import { mockBrowserFields } from '../../../../common/containers/source/mock';
import { Direction } from '../../../../../common/search_strategy';
import {
  defaultHeaders,
  mockGlobalState,
  mockTimelineData,
  createMockStore,
  TestProviders,
} from '../../../../common/mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';

import type { Props } from '.';
import { StatefulBody } from '.';
import type { Sort } from './sort';
import { getDefaultControlColumn } from './control_columns';
import { TimelineId, TimelineTabs } from '../../../../../common/types/timeline';
import { defaultRowRenderers } from './renderers';
import type { State } from '../../../../common/store';
import type { UseFieldBrowserOptionsProps } from '../../fields_browser';
import type {
  DraggableProvided,
  DraggableStateSnapshot,
  DroppableProvided,
  DroppableStateSnapshot,
} from '@hello-pangea/dnd';
import { DocumentDetailsRightPanelKey } from '../../../../flyout/document_details/shared/constants/panel_keys';
import { createTelemetryServiceMock } from '../../../../common/lib/telemetry/telemetry_service.mock';
import { createExpandableFlyoutApiMock } from '../../../../common/mock/expandable_flyout';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/components/guided_onboarding_tour/tour_step');
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

const mockOpenFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout');

const mockedTelemetry = createTelemetryServiceMock();

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
  const getWrapper = async (
    childrenComponent: JSX.Element,
    store?: { store: ReturnType<typeof createMockStore> }
  ) => {
    const wrapper = mount(childrenComponent, {
      wrappingComponent: TestProviders as EnzymeComponentType<{}>,
      wrappingComponentProps: store ?? {},
    });
    await waitFor(() => wrapper.find('[data-test-subj="suricataRefs"]').exists());

    return wrapper;
  };
  const mockRefetch = jest.fn();
  let appToastsMock: jest.Mocked<ReturnType<typeof useAppToastsMock.create>>;

  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      ...createExpandableFlyoutApiMock(),
      openFlyout: mockOpenFlyout,
    });

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
        telemetry: mockedTelemetry,
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

      const store = createMockStore(state);
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

  describe('event details', () => {
    beforeEach(() => {
      mockDispatch.mockReset();
    });

    test('open the expandable flyout to show event details for query tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: '1',
            indexName: undefined,
            scopeId: 'timeline-test',
          },
        },
      });
    });

    test('open the expandable flyout to show event details for pinned tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} tabType={TimelineTabs.pinned} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: '1',
            indexName: undefined,
            scopeId: 'timeline-test',
          },
        },
      });
    });

    test('open the expandable flyout to show event details for notes tab', async () => {
      const wrapper = await getWrapper(<StatefulBody {...props} tabType={TimelineTabs.notes} />);

      wrapper.find(`[data-test-subj="expand-event"]`).first().simulate('click');
      wrapper.update();
      expect(mockDispatch).not.toHaveBeenCalled();
      expect(mockOpenFlyout).toHaveBeenCalledWith({
        right: {
          id: DocumentDetailsRightPanelKey,
          params: {
            id: '1',
            indexName: undefined,
            scopeId: 'timeline-test',
          },
        },
      });
    });
  });
});
