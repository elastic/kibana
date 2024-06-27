/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FunctionComponent } from 'react';
import React, { useEffect } from 'react';
import QueryTabContent from '.';
import { defaultRowRenderers } from '../../body/renderers';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { mockSourcererScope } from '../../../../../sourcerer/containers/mocks';
import {
  createMockStore,
  createSecuritySolutionStorageMock,
  mockGlobalState,
  mockTimelineData,
  TestProviders,
} from '../../../../../common/mock';
import { DefaultCellRenderer } from '../../cell_rendering/default_cell_renderer';
import { render, screen, waitFor, fireEvent, within, cleanup } from '@testing-library/react';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../../types';
import { useKibana } from '../../../../../common/lib/kibana';
import { useDispatch } from 'react-redux';
import { timelineActions } from '../../../../store';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import userEvent from '@testing-library/user-event';

jest.mock('../../../../../common/components/user_privileges');

jest.mock('../../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../../containers/details');

jest.mock('../../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../../body/events', () => ({
  Events: () => <></>,
}));

jest.mock('../../../../../sourcerer/containers');
jest.mock('../../../../../sourcerer/containers/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../../common/lib/kuery');

jest.mock('../../../../../common/hooks/use_experimental_features');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn(() => ({
    pathname: '',
    search: '',
  })),
}));

// These tests can take more than standard timeout of 5s
// that is why we are increasing it.
const SPECIAL_TEST_TIMEOUT = 50000;

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  if (feature === 'unifiedComponentsInTimelineEnabled') {
    return true;
  }
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../../common/lib/kibana');

// unified-field-list is reporting multiple analytics events
jest.mock(`@kbn/ebt/client`);

const TestComponent = (props: Partial<ComponentProps<typeof QueryTabContent>>) => {
  const testComponentDefaultProps: ComponentProps<typeof QueryTabContent> = {
    timelineId: TimelineId.test,
    renderCellValue: DefaultCellRenderer,
    rowRenderers: defaultRowRenderers,
  };

  const dispatch = useDispatch();

  // populating timeline so that it is not blank
  useEffect(() => {
    dispatch(
      timelineActions.applyKqlFilterQuery({
        id: TimelineId.test,
        filterQuery: {
          kuery: {
            kind: 'kuery',
            expression: '*',
          },
          serializedQuery: '*',
        },
      })
    );
  }, [dispatch]);

  return <QueryTabContent {...testComponentDefaultProps} {...props} />;
};

const customColumnOrder = [
  ...defaultUdtHeaders,
  {
    columnHeaderType: defaultColumnHeaderType,
    id: 'event.severity',
  },
];

const mockState = {
  ...structuredClone(mockGlobalState),
};

mockState.timeline.timelineById[TimelineId.test].columns = customColumnOrder;

const TestWrapper: FunctionComponent = ({ children }) => {
  return <TestProviders store={createMockStore(mockState)}>{children}</TestProviders>;
};

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {
    wrapper: TestWrapper,
  });
};

const loadPageMock = jest.fn();

const useSourcererDataViewMocked = jest.fn().mockReturnValue({
  ...mockSourcererScope,
});

const { storage: storageMock } = createSecuritySolutionStorageMock();

let useTimelineEventsMock = jest.fn();

describe('query tab with unified timeline', () => {
  const kibanaServiceMock: StartServices = {
    ...createStartServicesMock(),
    storage: storageMock,
  };

  afterEach(() => {
    jest.clearAllMocks();
    storageMock.clear();
    cleanup();
    localStorage.clear();
  });

  beforeEach(() => {
    useTimelineEventsMock = jest.fn(() => [
      false,
      {
        events: structuredClone(mockTimelineData.slice(0, 1)),
        pageInfo: {
          activePage: 0,
          totalPages: 3,
        },
        refreshedAt: Date.now(),
        totalCount: 3,
        loadPage: loadPageMock,
      },
    ]);

    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: kibanaServiceMock,
      };
    });

    (useTimelineEvents as jest.Mock).mockImplementation(useTimelineEventsMock);

    (useTimelineEventsDetails as jest.Mock).mockImplementation(() => [false, {}]);

    (useSourcererDataView as jest.Mock).mockImplementation(useSourcererDataViewMocked);

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );

    (useUserPrivileges as jest.Mock).mockReturnValue({
      kibanaSecuritySolutionsPrivileges: { crud: true, read: true },
      endpointPrivileges: getEndpointPrivilegesInitialStateMock(),
      detectionEnginePrivileges: { loading: false, error: undefined, result: undefined },
    });
  });

  describe('render', () => {
    it(
      'should render unifiedDataTable in timeline',
      async () => {
        renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should render unified-field-list in timeline',
      async () => {
        renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('timeline-sidebar')).toBeVisible();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should show row-renderers correctly by default',
      async () => {
        renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(screen.getByTestId('timeline-row-renderer-0')).toBeVisible();
      },

      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should hide row-renderers when disabled',
      async () => {
        renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(screen.getByTestId('timeline-row-renderer-0')).toBeVisible();

        fireEvent.click(screen.getByTestId('show-row-renderers-gear'));
        expect(screen.getByTestId('row-renderers-modal')).toBeVisible();

        fireEvent.click(screen.getByTestId('disable-all'));

        expect(
          within(screen.getAllByTestId('renderer-checkbox')[0]).getByRole('checkbox')
        ).not.toBeChecked();

        fireEvent.click(screen.getByLabelText('Closes this modal window'));

        expect(screen.queryByTestId('row-renderers-modal')).not.toBeInTheDocument();

        expect(screen.queryByTestId('timeline-row-renderer-0')).not.toBeInTheDocument();
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('pagination', () => {
    beforeEach(() => {
      // should return all the records instead just 3
      // as the case in the default mock
      useTimelineEventsMock = jest.fn(() => [
        false,
        {
          events: structuredClone(mockTimelineData),
          pageInfo: {
            activePage: 0,
            totalPages: 10,
          },
          refreshedAt: Date.now(),
          totalCount: 70,
          loadPage: loadPageMock,
        },
      ]);

      (useTimelineEvents as jest.Mock).mockImplementation(useTimelineEventsMock);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it(
      'should paginate correctly',
      async () => {
        renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('tablePaginationPopoverButton')).toHaveTextContent(
            'Rows per page: 5'
          );
        });

        expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'true');
        expect(screen.getByTestId('pagination-button-6')).toBeVisible();

        fireEvent.click(screen.getByTestId('pagination-button-6'));

        await waitFor(() => {
          expect(screen.getByTestId('pagination-button-6')).toHaveAttribute('aria-current', 'true');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should load more records according to sample size correctly',
      async () => {
        renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('pagination-button-0')).toHaveAttribute('aria-current', 'true');
          expect(screen.getByTestId('pagination-button-6')).toBeVisible();
        });
        // Go to last page
        fireEvent.click(screen.getByTestId('pagination-button-6'));
        await waitFor(() => {
          expect(screen.getByTestId('dscGridSampleSizeFetchMoreLink')).toBeVisible();
        });
        fireEvent.click(screen.getByTestId('dscGridSampleSizeFetchMoreLink'));
        expect(loadPageMock).toHaveBeenNthCalledWith(1, 1);
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('columns', () => {
    it(
      'should move column left/right correctly ',
      async () => {
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        const messageColumnIndex =
          customColumnOrder.findIndex((header) => header.id === 'message') + 3;
        // 3 is the offset for additional leading columns on left

        expect(container.querySelector('[data-gridcell-column-id="message"]')).toHaveAttribute(
          'data-gridcell-column-index',
          String(messageColumnIndex)
        );

        expect(container.querySelector('[data-gridcell-column-id="message"]')).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            '[data-gridcell-column-id="message"] .euiDataGridHeaderCell__icon'
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Move left')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Move left'));

        await waitFor(() => {
          expect(container.querySelector('[data-gridcell-column-id="message"]')).toHaveAttribute(
            'data-gridcell-column-index',
            String(messageColumnIndex - 1)
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should remove column',
      async () => {
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(container.querySelector('[data-gridcell-column-id="message"]')).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            '[data-gridcell-column-id="message"] .euiDataGridHeaderCell__icon'
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Remove column')).toBeVisible();
        });

        fireEvent.click(screen.getByTitle('Remove column'));

        await waitFor(() => {
          expect(
            container.querySelector('[data-gridcell-column-id="message"]')
          ).not.toBeInTheDocument();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort date column',
      async () => {
        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector('[data-gridcell-column-id="@timestamp"]')
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            '[data-gridcell-column-id="@timestamp"] .euiDataGridHeaderCell__icon'
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Sort Old-New')).toBeVisible();
        });
        expect(screen.getByTitle('Sort New-Old')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort Old-New'));

        await waitFor(() => {
          expect(useTimelineEventsMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              sort: [
                {
                  direction: 'asc',
                  esTypes: ['date'],
                  field: '@timestamp',
                  type: 'date',
                },
              ],
            })
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort string column correctly',
      async () => {
        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector('[data-gridcell-column-id="host.name"]')
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            '[data-gridcell-column-id="host.name"] .euiDataGridHeaderCell__icon'
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTestId('dataGridHeaderCellActionGroup-host.name')).toBeVisible();
        });

        expect(screen.getByTitle('Sort A-Z')).toBeVisible();
        expect(screen.getByTitle('Sort Z-A')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort A-Z'));

        await waitFor(() => {
          expect(useTimelineEventsMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              sort: [
                {
                  direction: 'desc',
                  esTypes: ['date'],
                  field: '@timestamp',
                  type: 'date',
                },
                {
                  direction: 'asc',
                  esTypes: [],
                  field: 'host.name',
                  type: 'string',
                },
              ],
            })
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should sort number column',
      async () => {
        const field = {
          name: 'event.severity',
          type: 'number',
        };

        const { container } = renderTestComponents();
        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            `[data-gridcell-column-id="${field.name}"] .euiDataGridHeaderCell__icon`
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTestId(`dataGridHeaderCellActionGroup-${field.name}`)).toBeVisible();
        });

        expect(screen.getByTitle('Sort Low-High')).toBeVisible();
        expect(screen.getByTitle('Sort High-Low')).toBeVisible();

        useTimelineEventsMock.mockClear();

        fireEvent.click(screen.getByTitle('Sort Low-High'));

        await waitFor(() => {
          expect(useTimelineEventsMock).toHaveBeenNthCalledWith(
            1,
            expect.objectContaining({
              sort: [
                {
                  direction: 'desc',
                  esTypes: ['date'],
                  field: '@timestamp',
                  type: 'date',
                },
                {
                  direction: 'asc',
                  esTypes: [],
                  field: field.name,
                  type: field.type,
                },
              ],
            })
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('left controls', () => {
    it(
      'should clear all sorting',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        expect(screen.getByTestId('dataGridColumnSortingButton')).toBeVisible();
        expect(
          within(screen.getByTestId('dataGridColumnSortingButton')).getByRole('marquee')
        ).toHaveTextContent('1');

        fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

        // // timestamp sorting indicators
        expect(
          await screen.findByTestId('euiDataGridColumnSorting-sortColumn-@timestamp')
        ).toBeVisible();

        expect(screen.getByTestId('dataGridHeaderCellSortingIcon-@timestamp')).toBeVisible();

        fireEvent.click(screen.getByTestId('dataGridColumnSortingClearButton'));

        await waitFor(() => {
          expect(screen.queryByTestId('dataGridHeaderCellSortingIcon-@timestamp')).toBeNull();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be able to sort by multiple columns',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        expect(screen.getByTestId('dataGridColumnSortingButton')).toBeVisible();
        expect(
          within(screen.getByTestId('dataGridColumnSortingButton')).getByRole('marquee')
        ).toHaveTextContent('1');

        fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

        // // timestamp sorting indicators
        expect(
          await screen.findByTestId('euiDataGridColumnSorting-sortColumn-@timestamp')
        ).toBeVisible();

        expect(screen.getByTestId('dataGridHeaderCellSortingIcon-@timestamp')).toBeVisible();

        // add more columns to sorting
        fireEvent.click(screen.getByText(/Pick fields to sort by/));

        await waitFor(() => {
          expect(
            screen.getByTestId('dataGridColumnSortingPopoverColumnSelection-event.severity')
          ).toBeVisible();
        });

        fireEvent.click(
          screen.getByTestId('dataGridColumnSortingPopoverColumnSelection-event.severity')
        );

        // check new columns for sorting validity
        await waitFor(() => {
          expect(screen.getByTestId('dataGridHeaderCellSortingIcon-event.severity')).toBeVisible();
        });
        expect(
          screen.getByTestId('euiDataGridColumnSorting-sortColumn-event.severity')
        ).toBeVisible();

        expect(screen.getByTestId('dataGridHeaderCellSortingIcon-@timestamp')).toBeVisible();
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('unified fields list', () => {
    it(
      'should remove the column when clicked on X sign',
      async () => {
        const field = {
          name: 'event.severity',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            String(customColumnOrder.length)
          );
        });

        // column exists in the table
        expect(screen.getByTestId(`dataGridHeaderCell-${field.name}`)).toBeVisible();

        fireEvent.click(screen.getAllByTestId(`fieldToggle-${field.name}`)[0]);

        // column not longer exists in the table
        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            String(customColumnOrder.length - 1)
          );
        });
        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(0);
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should add the column when clicked on ⊕ sign',
      async () => {
        const field = {
          name: 'agent.id',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            String(customColumnOrder.length)
          );
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(0);

        // column exists in the table
        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        fireEvent.click(within(availableFields).getByTestId(`fieldToggle-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            String(customColumnOrder.length + 1)
          );
        });
        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(1);
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should should show callout when field search does not matches any field',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent(
            '37'
          );
        });

        fireEvent.change(screen.getByTestId('fieldListFiltersFieldSearch'), {
          target: { value: 'fake_field' },
        });

        await waitFor(() => {
          expect(
            screen.getByTestId('fieldListGroupedAvailableFieldsNoFieldsCallout-noFieldsMatch')
          ).toBeVisible();
        });

        expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent('0');
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should toggle side bar correctly',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        expect(screen.getByTestId('fieldListGroupedFieldGroups')).toBeVisible();

        fireEvent.click(screen.getByTitle('Hide sidebar'));

        await waitFor(() => {
          expect(screen.queryByTestId('fieldListGroupedFieldGroups')).not.toBeInTheDocument();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('row leading actions', () => {
    it(
      'should be able to add notes',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
        });

        fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

        await waitFor(() => {
          expect(screen.getByTestId('add-note-container')).toBeVisible();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be cancel adding notes',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
        });

        fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

        await waitFor(() => {
          expect(screen.getByTestId('add-note-container')).toBeVisible();
        });

        userEvent.type(screen.getByTestId('euiMarkdownEditorTextArea'), 'Test Note 1');

        expect(screen.getByTestId('cancel')).not.toBeDisabled();

        fireEvent.click(screen.getByTestId('cancel'));

        await waitFor(() => {
          expect(screen.queryByTestId('add-note-container')).not.toBeInTheDocument();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});
