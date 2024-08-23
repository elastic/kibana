/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FunctionComponent, PropsWithChildren } from 'react';
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
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { defaultColumnHeaderType } from '../../body/column_headers/default_headers';
import { useUserPrivileges } from '../../../../../common/components/user_privileges';
import { getEndpointPrivilegesInitialStateMock } from '../../../../../common/components/user_privileges/endpoint/mocks';
import * as timelineActions from '../../../../store/actions';

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
  if (feature === 'unifiedComponentsInTimelineDisabled') {
    return false;
  }
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../../common/lib/kibana');

// unified-field-list is reporting multiple analytics events
jest.mock(`@elastic/ebt/client`);

const mockOpenFlyout = jest.fn();
const mockCloseFlyout = jest.fn();
jest.mock('@kbn/expandable-flyout', () => {
  return {
    useExpandableFlyoutApi: () => ({
      openFlyout: mockOpenFlyout,
      closeFlyout: mockCloseFlyout,
    }),
    TestProvider: ({ children }: PropsWithChildren<{}>) => <>{children}</>,
  };
});

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
  beforeAll(() => {
    // https://github.com/atlassian/react-beautiful-dnd/blob/4721a518356f72f1dac45b5fd4ee9d466aa2996b/docs/guides/setup-problem-detection-and-error-recovery.md#disable-logging
    Object.defineProperty(window, '__@hello-pangea/dnd-disable-dev-warnings', {
      get() {
        return true;
      },
    });
  });
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

  // FLAKY: https://github.com/elastic/kibana/issues/189791
  describe.skip('pagination', () => {
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

  // FLAKY: https://github.com/elastic/kibana/issues/189792
  // FLAKY: https://github.com/elastic/kibana/issues/189793
  describe.skip('left controls', () => {
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

  describe('Leading actions - expand event', () => {
    it(
      'should expand and collapse event correctly',
      async () => {
        renderTestComponents();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        expect(screen.getByTestId('docTableExpandToggleColumn').firstChild).toHaveAttribute(
          'data-euiicon-type',
          'expand'
        );

        // Open Flyout
        fireEvent.click(screen.getByTestId('docTableExpandToggleColumn'));

        await waitFor(() => {
          expect(mockOpenFlyout).toHaveBeenNthCalledWith(1, {
            right: {
              id: 'document-details-right',
              params: {
                id: '1',
                indexName: '',
                scopeId: TimelineId.test,
              },
            },
          });
        });

        expect(screen.getByTestId('docTableExpandToggleColumn').firstChild).toHaveAttribute(
          'data-euiicon-type',
          'minimize'
        );

        // Close Flyout
        fireEvent.click(screen.getByTestId('docTableExpandToggleColumn'));

        await waitFor(() => {
          expect(mockCloseFlyout).toHaveBeenNthCalledWith(1);
          expect(screen.getByTestId('docTableExpandToggleColumn').firstChild).toHaveAttribute(
            'data-euiicon-type',
            'expand'
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('Leading actions - notes', () => {
    // FLAKY: https://github.com/elastic/kibana/issues/189794
    describe.skip('securitySolutionNotesEnabled = true', () => {
      beforeEach(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
          jest.fn((feature: keyof ExperimentalFeatures) => {
            if (feature === 'unifiedComponentsInTimelineDisabled') {
              return false;
            }
            if (feature === 'securitySolutionNotesEnabled') {
              return true;
            }
            return allowedExperimentalValues[feature];
          })
        );
      });

      it(
        'should have the notification dot & correct tooltip',
        async () => {
          renderTestComponents();
          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getAllByTestId('timeline-notes-button-small')).toHaveLength(1);
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();

          expect(screen.getByTestId('timeline-notes-notification-dot')).toBeVisible();

          fireEvent.mouseOver(screen.getByTestId('timeline-notes-button-small'));

          await waitFor(() => {
            expect(screen.getByTestId('timeline-notes-tool-tip')).toBeVisible();
            expect(screen.getByTestId('timeline-notes-tool-tip')).toHaveTextContent(
              '1 Note available. Click to view it & add more.'
            );
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
      it(
        'should be able to add notes through expandable flyout',
        async () => {
          renderTestComponents();
          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          await waitFor(() => {
            expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
          });

          fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

          await waitFor(() => {
            expect(mockOpenFlyout).toHaveBeenCalled();
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });

    describe('securitySolutionNotesEnabled = false', () => {
      beforeEach(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
          jest.fn((feature: keyof ExperimentalFeatures) => {
            if (feature === 'unifiedComponentsInTimelineDisabled') {
              return false;
            }
            if (feature === 'securitySolutionNotesEnabled') {
              return false;
            }
            return allowedExperimentalValues[feature];
          })
        );
      });

      it(
        'should have the notification dot & correct tooltip',
        async () => {
          renderTestComponents();
          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getAllByTestId('timeline-notes-button-small')).toHaveLength(1);
          expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();

          expect(screen.getByTestId('timeline-notes-notification-dot')).toBeVisible();

          fireEvent.mouseOver(screen.getByTestId('timeline-notes-button-small'));

          await waitFor(() => {
            expect(screen.getByTestId('timeline-notes-tool-tip')).toBeVisible();
            expect(screen.getByTestId('timeline-notes-tool-tip')).toHaveTextContent(
              '1 Note available. Click to view it & add more.'
            );
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
      it(
        'should be able to add notes using EuiFlyout',
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
        'should cancel adding notes',
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

          expect(screen.getByTestId('cancel')).not.toBeDisabled();

          fireEvent.click(screen.getByTestId('cancel'));

          await waitFor(() => {
            expect(screen.queryByTestId('add-note-container')).not.toBeInTheDocument();
          });
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should be able to delete notes',
        async () => {
          renderTestComponents();
          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          await waitFor(() => {
            expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
          });

          fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

          await waitFor(() => {
            expect(screen.getByTestId('delete-note')).toBeVisible();
          });

          const noteDeleteSpy = jest.spyOn(timelineActions, 'setConfirmingNoteId');

          fireEvent.click(screen.getByTestId('delete-note'));

          await waitFor(() => {
            expect(noteDeleteSpy).toHaveBeenCalled();
            expect(noteDeleteSpy).toHaveBeenCalledWith({
              confirmingNoteId: '1',
              id: TimelineId.test,
            });
          });
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should not show toggle event details action',
        async () => {
          renderTestComponents();
          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          await waitFor(() => {
            expect(screen.getByTestId('timeline-notes-button-small')).not.toBeDisabled();
          });

          fireEvent.click(screen.getByTestId('timeline-notes-button-small'));

          await waitFor(() => {
            expect(screen.queryByTestId('notes-toggle-event-details')).not.toBeInTheDocument();
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });
  });

  describe('Leading actions - pin', () => {
    describe('securitySolutionNotesEnabled = true', () => {
      beforeEach(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
          jest.fn((feature: keyof ExperimentalFeatures) => {
            if (feature === 'securitySolutionNotesEnabled') {
              return true;
            }
            return allowedExperimentalValues[feature];
          })
        );
      });
      it(
        'should have the pin button with correct tooltip',
        async () => {
          renderTestComponents();

          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getAllByTestId('pin')).toHaveLength(1);
          // disabled because it is already pinned
          expect(screen.getByTestId('pin')).toBeDisabled();

          fireEvent.mouseOver(screen.getByTestId('pin'));

          await waitFor(() => {
            expect(screen.getByTestId('timeline-action-pin-tool-tip')).toBeVisible();
            expect(screen.getByTestId('timeline-action-pin-tool-tip')).toHaveTextContent(
              'This event cannot be unpinned because it has notes'
            );
            /*
             * Above event is alert and not an event but `getEventType` in
             *x-pack/plugins/security_solution/public/timelines/components/timeline/body/helpers.tsx
             * returns it has event and not an alert even though, it has event.kind as signal.
             * Need to see if it is okay
             *
             * */
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });

    describe('securitySolutionNotesEnabled = false', () => {
      beforeEach(() => {
        (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
          jest.fn((feature: keyof ExperimentalFeatures) => {
            if (feature === 'securitySolutionNotesEnabled') {
              return false;
            }
            return allowedExperimentalValues[feature];
          })
        );
      });

      it(
        'should have the pin button with correct tooltip',
        async () => {
          renderTestComponents();

          expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

          expect(screen.getAllByTestId('pin')).toHaveLength(1);
          // disabled because it is already pinned
          expect(screen.getByTestId('pin')).toBeDisabled();

          fireEvent.mouseOver(screen.getByTestId('pin'));

          await waitFor(() => {
            expect(screen.getByTestId('timeline-action-pin-tool-tip')).toBeVisible();
            expect(screen.getByTestId('timeline-action-pin-tool-tip')).toHaveTextContent(
              'This event cannot be unpinned because it has notes'
            );
            /*
             * Above event is alert and not an event but `getEventType` in
             * x-pack/plugins/security_solution/public/timelines/components/timeline/body/helpers.tsx
             * returns it has event and not an alert even though, it has event.kind as signal.
             * Need to see if it is okay
             *
             * */
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });
  });
});
