/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React from 'react';
import { TimelineId } from '../../../../../../common/types/timeline';
import {
  createSecuritySolutionStorageMock,
  mockGlobalState,
  TestProviders,
} from '../../../../../common/mock';
import { createMockStore } from '../../../../../common/mock/create_store';
import { render, screen, waitFor, fireEvent, within, cleanup } from '@testing-library/react';
import { createStartServicesMock } from '../../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../../types';
import { useKibana } from '../../../../../common/lib/kibana';
import UnifiedEsql from './unified_esql';
import {
  mockESQLTimelineData,
  mockESQLTimelineNoResultResponse,
} from '../../../../../common/containers/use_esql_based_query_events/test.data';
import { useGetAdHocDataViewWithESQLQuery } from '../../../../../common/containers/sourcerer/use_get_ad_hoc_data_view_with_esql_query';
import { useESQLBasedEvents } from '../../../../../common/containers/use_esql_based_query_events';
import { useGetStatefulQueryBar } from './use_get_stateful_query_bar';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import type { ExperimentalFeatures } from '../../../../../../common';
import { allowedExperimentalValues } from '../../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../../common/hooks/use_experimental_features';
import { timelineDefaults } from '../../../../store/defaults';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import { mockSourcererScope } from '../../../../../common/containers/sourcerer/mocks';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';

jest.mock('./use_get_stateful_query_bar');
jest.mock('../../../../../common/containers/use_esql_based_query_events');
jest.mock('../../../../../common/containers/sourcerer/use_get_ad_hoc_data_view_with_esql_query');
jest.mock('../../body/events', () => ({
  Events: () => <></>,
}));

// jest.mock('../../../../../common/containers/sourcerer/use_signal_helpers', () => ({
//   useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
// }));

jest.mock('../../../../../common/lib/kuery');

jest.mock('../../../../../common/hooks/use_experimental_features');

// These tests can take more than standard timeout of 5s
// that is why we are setting it to 15s
const SPECIAL_TEST_TIMEOUT = 15000;

jest.mock('../../../../../common/lib/kibana');

// unified-field-list is is reporiting multiple analytics events
jest.mock(`@kbn/analytics-client`);

jest.mock('../../../../../common/containers/sourcerer');

const useSourcererDataViewMocked = jest.fn().mockReturnValue({
  ...mockSourcererScope,
});

const globalState = structuredClone(mockGlobalState);

const globalStateWithESQL: typeof mockGlobalState = {
  ...globalState,
  timeline: {
    ...globalState.timeline,
    timelineById: {
      [TimelineId.test]: {
        ...globalState.timeline.timelineById[TimelineId.test],
        columns: defaultUdtHeaders,
        esqlOptions: {
          visibleColumns: timelineDefaults.esqlOptions.visibleColumns,
          sort: [
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'desc',
            },
          ],
          queryValidation: {
            hasKeepClause: false,
            sourceCommand: 'from',
          },
          query: {
            esql: 'from some_query | keep "some columns"',
          },
        },
      },
    },
  },
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useLocation: jest.fn().mockReturnValue({
    pathname: '',
    search: '',
    state: {},
    hash: '',
  }),
}));

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  if (feature === 'unifiedComponentsInTimelineEnabled') {
    return true;
  }
  return allowedExperimentalValues[feature];
});

interface TestComponentProps {
  customState?: typeof mockGlobalState;
}

const TestComponent = ({ customState = globalStateWithESQL }: TestComponentProps) => {
  return (
    <TestProviders store={createMockStore(customState)}>
      <UnifiedEsql timelineId={TimelineId.test} />
    </TestProviders>
  );
};

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {});
};

const actualTimelineData = structuredClone(mockESQLTimelineData);
const emptyData = structuredClone(mockESQLTimelineNoResultResponse);

const useESQLBasedEventsMock = jest.fn(() => {
  return {
    data: actualTimelineData,
  };
});

const getDataViewMock = jest.fn();

const useAdHocDataViewWithESQLQuery = jest.fn(() => ({
  getDataView: getDataViewMock,
  isLoading: false,
}));

const { storage: storageMock } = createSecuritySolutionStorageMock();

describe('unified esql tab', () => {
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
    // increase timeout for these tests as they are rendering a complete table with ~30 rows which can take time.
    const ONE_SECOND = 1000;
    jest.setTimeout(10 * ONE_SECOND);
    HTMLElement.prototype.getBoundingClientRect = jest.fn(() => {
      return {
        width: 1000,
        height: 1000,
        x: 0,
        y: 0,
      } as DOMRect;
    });

    (useGetStatefulQueryBar as jest.Mock).mockReturnValue({
      CustomSearchBar: SearchBar,
    });

    (useKibana as jest.Mock).mockImplementation(() => {
      return {
        services: kibanaServiceMock,
      };
    });

    (useESQLBasedEvents as jest.Mock).mockImplementation(useESQLBasedEventsMock);

    (useGetAdHocDataViewWithESQLQuery as jest.Mock).mockImplementation(
      useAdHocDataViewWithESQLQuery
    );

    (useIsExperimentalFeatureEnabled as jest.Mock).mockImplementation(
      useIsExperimentalFeatureEnabledMock
    );

    (useSourcererDataView as jest.Mock).mockImplementation(useSourcererDataViewMocked);
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
    it.skip(
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

    it.skip(
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

        expect(screen.queryByTestId('row-renderers-modal')).toBeFalsy();

        expect(screen.queryByTestId('timeline-row-renderer-0')).toBeFalsy();
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('pagination', () => {
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
        expect(screen.getByTestId('pagination-button-5')).toBeVisible();

        fireEvent.click(screen.getByTestId('pagination-button-5'));

        await waitFor(() => {
          expect(screen.getByTestId('pagination-button-5')).toHaveAttribute('aria-current', 'true');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it.skip(
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
    describe('when user has requested specific fields i.e. KEEP clause in ES|QL query', () => {
      it(
        'should move column left/right correctly ',
        async () => {
          const { container } = renderTestComponents();

          await waitFor(() => {
            expect(screen.getByTestId('discoverDocTable')).toBeVisible();
          });
          expect(container.querySelector('[data-gridcell-column-id="message"]')).toHaveAttribute(
            'data-gridcell-column-index',
            '10'
          );

          expect(
            container.querySelector('[data-gridcell-column-id="message"]')
          ).toBeInTheDocument();

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
              '9'
            );
          });
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should be able remove column successfully',
        async () => {
          const { container } = renderTestComponents();

          await waitFor(() => {
            expect(screen.getByTestId('discoverDocTable')).toBeVisible();
          });

          expect(
            container.querySelector('[data-gridcell-column-id="message"]')
          ).toBeInTheDocument();

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

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.getByTestId('euiDataGridColumnSorting-sortColumn-@timestamp')
            ).toBeVisible();
          });

          expect(
            screen.getByTestId('euiDataGridColumnSorting-sortColumn-@timestamp-desc')
          ).toHaveAttribute('aria-pressed', 'true');

          // close sorting popover
          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

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

          fireEvent.click(screen.getByTitle('Sort Old-New'));

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.getByTestId('euiDataGridColumnSorting-sortColumn-@timestamp')
            ).toBeVisible();
          });

          expect(
            screen.getByTestId('euiDataGridColumnSorting-sortColumn-@timestamp-asc')
          ).toHaveAttribute('aria-pressed', 'true');
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

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.queryByTestId('euiDataGridColumnSorting-sortColumn-host.name')
            ).toBeFalsy();
          });

          // close sorting popover
          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

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

          fireEvent.click(screen.getByTitle('Sort A-Z'));

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.getByTestId('euiDataGridColumnSorting-sortColumn-host.name')
            ).toBeVisible();
          });

          expect(
            screen.getByTestId('euiDataGridColumnSorting-sortColumn-host.name-asc')
          ).toHaveAttribute('aria-pressed', 'true');
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should sort number column',
        async () => {
          const field = {
            name: 'process.uptime',
            type: 'number',
          };

          renderTestComponents();
          await waitFor(() => {
            expect(screen.getByTestId('discoverDocTable')).toBeVisible();
          });

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.queryByTestId(`euiDataGridColumnSorting-sortColumn-${field.name}`)
            ).toBeFalsy();
          });

          // close sorting popover
          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          fireEvent.click(screen.getByTestId(`dataGridHeaderCellActionButton-${field.name}`));

          await waitFor(() => {
            expect(screen.getByTestId(`dataGridHeaderCellActionGroup-${field.name}`)).toBeVisible();
          });

          expect(screen.getByTitle('Sort Low-High')).toBeVisible();
          expect(screen.getByTitle('Sort High-Low')).toBeVisible();

          fireEvent.click(screen.getByTitle('Sort Low-High'));

          fireEvent.click(screen.getByTestId('dataGridColumnSortingButton'));

          await waitFor(() => {
            expect(
              screen.getByTestId(`euiDataGridColumnSorting-sortColumn-${field.name}`)
            ).toBeVisible();
          });

          expect(
            screen.getByTestId('euiDataGridColumnSorting-sortColumn-process.uptime-asc')
          ).toHaveAttribute('aria-pressed', 'true');
        },
        SPECIAL_TEST_TIMEOUT
      );
    });
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
            screen.getByTestId('dataGridColumnSortingPopoverColumnSelection-host.name')
          ).toBeVisible();
        });

        fireEvent.click(
          screen.getByTestId('dataGridColumnSortingPopoverColumnSelection-host.name')
        );

        // check new columns for sorting validity
        await waitFor(() => {
          expect(screen.getByTestId('dataGridHeaderCellSortingIcon-host.name')).toBeVisible();
        });

        expect(screen.getByTestId('euiDataGridColumnSorting-sortColumn-host.name')).toBeVisible();

        expect(screen.getByTestId('dataGridHeaderCellSortingIcon-@timestamp')).toBeVisible();
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('unified fields list', () => {
    beforeEach(() => {
      const customStateWithQueryWithoutKeepClause = structuredClone(globalStateWithESQL);
      customStateWithQueryWithoutKeepClause.timeline.timelineById[
        TimelineId.test
      ].esqlOptions.query.esql = 'from some_index*';
      renderTestComponents({
        customState: customStateWithQueryWithoutKeepClause,
      });
    });
    describe('when user has NOT requested any particular fields i.e. no KEEP clause in ES|QL query', () => {
      it(
        'should remove the column when clicked on X sign',
        async () => {
          const field = {
            name: 'event.action',
          };

          expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

          await waitFor(() => {
            expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
              String(defaultUdtHeaders.length)
            );
          });

          // column exists in the table
          expect(screen.getByTestId(`dataGridHeaderCell-${field.name}`)).toBeVisible();

          fireEvent.click(screen.getAllByTestId(`fieldToggle-${field.name}`)[0]);

          // column not longer exists in the table
          await waitFor(() => {
            expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
              String(defaultUdtHeaders.length - 1)
            );
          });
          expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(0);
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should add the column when clicked on ⊕ sign',
        async () => {
          const availableFieldButNotSelected = {
            name: 'event.kind',
          };

          expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

          await waitFor(() => {
            expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
              String(defaultUdtHeaders.length)
            );
          });

          const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

          fireEvent.click(
            within(availableFields).getByTestId(`fieldToggle-${availableFieldButNotSelected.name}`)
          );

          await waitFor(() => {
            expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
              String(defaultUdtHeaders.length + 1)
            );
          });

          expect(
            screen.queryAllByTestId(`dataGridHeaderCell-${availableFieldButNotSelected.name}`)
          ).toHaveLength(1);
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should should show callout when field search does not matches any field',
        async () => {
          expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

          fireEvent.change(screen.getByTestId('fieldListFiltersFieldSearch'), {
            target: { value: 'fake_field' },
          });

          await waitFor(() => {
            expect(
              screen.getByTestId('fieldListGroupedAvailableFieldsNoFieldsCallout-noFieldsMatch')
            ).toBeVisible();
          });

          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent(
            '0'
          );
        },
        SPECIAL_TEST_TIMEOUT
      );

      it(
        'should toggle side bar correctly',
        async () => {
          expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();
          await waitFor(() => {
            expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent(
              '37'
            );
          });

          fireEvent.click(screen.getByTitle('Hide sidebar'));

          await waitFor(() => {
            expect(screen.queryAllByTestId('fieldListGroupedAvailableFields-count')).toHaveLength(
              0
            );
          });
        },
        SPECIAL_TEST_TIMEOUT
      );
    });
  });
});
