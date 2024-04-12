/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps } from 'react';
import React, { useEffect } from 'react';
import QueryTabContent from '.';
import { defaultRowRenderers } from '../../body/renderers';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../../containers';
import { useTimelineEventsDetails } from '../../../../containers/details';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../../common/containers/sourcerer/mocks';
import {
  createSecuritySolutionStorageMock,
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
import { cloneDeep, flatten } from 'lodash';

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

jest.mock('../../../../../common/containers/sourcerer');
jest.mock('../../../../../common/containers/sourcerer/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../../common/lib/kuery');

jest.mock('../../../../../common/hooks/use_experimental_features');

// These tests can take more than standard timeout of 5s
// that is why we are setting it to 15s
const SPECIAL_TEST_TIMEOUT = 15000;

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  if (feature === 'unifiedComponentsInTimelineEnabled') {
    return true;
  }
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../../common/lib/kibana');

// unified-field-list is is reporiting multiple analytics events
jest.mock(`@kbn/analytics-client`);

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

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {
    wrapper: TestProviders,
  });
};

const changeItemsPerPageTo = (newItemsPerPage: number) => {
  fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
  fireEvent.click(screen.getByTestId(`tablePagination-${newItemsPerPage}-rows`));
  expect(screen.getByTestId('tablePaginationPopoverButton')).toHaveTextContent(
    `Rows per page: ${newItemsPerPage}`
  );
};

const loadPageMock = jest.fn();

const useTimelineEventsMock = jest.fn(() => [
  false,
  {
    events: cloneDeep(mockTimelineData),
    pageInfo: {
      activePage: 0,
      totalPages: 10,
    },
    refreshedAt: Date.now(),
    totalCount: 70,
    loadPage: loadPageMock,
  },
]);

const useSourcererDataViewMocked = jest.fn().mockReturnValue({
  ...mockSourcererScope,
});

const { storage: storageMock } = createSecuritySolutionStorageMock();

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
    it('should show row-renderers correctly by default', async () => {
      renderTestComponents();
      await waitFor(() => {
        expect(screen.getByTestId('discoverDocTable')).toBeVisible();
      });

      expect(screen.getByTestId('timeline-row-renderer-0')).toBeVisible();
    });

    it('should hide row-renderers when disabled', async () => {
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
    });
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
    // Failing: See https://github.com/elastic/kibana/issues/179831
    // currently moving /removing columns results in infinite loop
    it.skip(
      'should move column left/right correctly ',
      async () => {
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(container.querySelector('[data-gridcell-column-id="message"]')).toHaveAttribute(
          'data-gridcell-column-index',
          '12'
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
            '11'
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    // Failing: See https://github.com/elastic/kibana/issues/179831
    // currently moving /removing columns results in infinite loop
    it.skip(
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

    // Failing: See https://github.com/elastic/kibana/issues/179831
    it.skip(
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
                  esTypes: [],
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
                  esTypes: [],
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
                  esTypes: [],
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

  // Failing: See https://github.com/elastic/kibana/issues/179831
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

    // Failing: See https://github.com/elastic/kibana/issues/179831
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
            '11'
          );
        });

        // column exists in the table
        expect(screen.getByTestId(`dataGridHeaderCell-${field.name}`)).toBeVisible();

        fireEvent.click(screen.getAllByTestId(`fieldToggle-${field.name}`)[0]);

        // column not longer exists in the table
        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            '10'
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
            '11'
          );
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(0);

        // column exists in the table
        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        fireEvent.click(within(availableFields).getByTestId(`fieldToggle-${field.name}`));

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent(
            '12'
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
        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toHaveTextContent(
            '37'
          );
        });

        fireEvent.click(screen.getByTitle('Hide sidebar'));

        await waitFor(() => {
          expect(screen.queryAllByTestId('fieldListGroupedAvailableFields-count')).toHaveLength(0);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should have all populated fields in Available fields section',
      async () => {
        const listOfPopulatedFields = new Set(
          flatten(
            mockTimelineData.map((dataItem) =>
              dataItem.data.map((item) =>
                item.value && item.value.length > 0 ? item.field : undefined
              )
            )
          ).filter((item) => typeof item !== 'undefined')
        );

        renderTestComponents();

        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        changeItemsPerPageTo(100);

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        for (const field of listOfPopulatedFields) {
          fireEvent.change(screen.getByTestId('fieldListFiltersFieldSearch'), {
            target: { value: field },
          });

          expect(within(availableFields).getByTestId(`field-${field}`));
        }
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});
