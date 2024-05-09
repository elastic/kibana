/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentProps, FC, PropsWithChildren } from 'react';
import React, { useEffect } from 'react';
import type QueryTabContent from '.';
import { UnifiedTimeline } from '.';
import { TimelineId } from '../../../../../common/types/timeline';
import { useTimelineEvents } from '../../../containers';
import { useTimelineEventsDetails } from '../../../containers/details';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { mockSourcererScope } from '../../../../common/containers/sourcerer/mocks';
import {
  createSecuritySolutionStorageMock,
  mockTimelineData,
  TestProviders,
} from '../../../../common/mock';
import { createMockStore } from '../../../../common/mock/create_store';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { createStartServicesMock } from '../../../../common/lib/kibana/kibana_react.mock';
import type { StartServices } from '../../../../types';
import { useKibana } from '../../../../common/lib/kibana';
import { useDispatch } from 'react-redux';
import { timelineActions } from '../../../store';
import type { ExperimentalFeatures } from '../../../../../common';
import { allowedExperimentalValues } from '../../../../../common';
import { useIsExperimentalFeatureEnabled } from '../../../../common/hooks/use_experimental_features';
import { TimelineTabs } from '@kbn/securitysolution-data-table';
import { DataLoadingState } from '@kbn/unified-data-table';
import { getColumnHeaders } from '../body/column_headers/helpers';
import { defaultUdtHeaders } from './default_headers';
import type { ColumnHeaderType } from '../../../../../common/types';

jest.mock('../../../containers', () => ({
  useTimelineEvents: jest.fn(),
}));

jest.mock('../../../containers/details');

jest.mock('../../fields_browser', () => ({
  useFieldBrowserOptions: jest.fn(),
}));

jest.mock('../body/events', () => ({
  Events: () => <></>,
}));

jest.mock('../../../../common/containers/sourcerer');
jest.mock('../../../../common/containers/sourcerer/use_signal_helpers', () => ({
  useSignalHelpers: () => ({ signalIndexNeedsInit: false }),
}));

jest.mock('../../../../common/lib/kuery');

jest.mock('../../../../common/hooks/use_experimental_features');

const useIsExperimentalFeatureEnabledMock = jest.fn((feature: keyof ExperimentalFeatures) => {
  if (feature === 'unifiedComponentsInTimelineEnabled') {
    return true;
  }
  return allowedExperimentalValues[feature];
});

jest.mock('../../../../common/lib/kibana');

// unified-field-list is is reporiting multiple analytics events
jest.mock(`@kbn/analytics-client`);

const columnsToDisplay = [
  ...defaultUdtHeaders,
  {
    columnHeaderType: 'not-filtered' as ColumnHeaderType,
    id: 'event.severity',
  },
];

// These tests can take more than standard timeout of 5s
// that is why we are setting it to 10s
const SPECIAL_TEST_TIMEOUT = 10000;

const localMockedTimelineData = structuredClone(mockTimelineData);

const TestComponent = (props: Partial<ComponentProps<typeof UnifiedTimeline>>) => {
  const testComponentDefaultProps: ComponentProps<typeof QueryTabContent> = {
    columns: getColumnHeaders(columnsToDisplay, mockSourcererScope.browserFields),
    activeTab: TimelineTabs.query,
    rowRenderers: [],
    timelineId: TimelineId.test,
    itemsPerPage: 10,
    itemsPerPageOptions: [],
    sort: [
      {
        columnId: '@timestamp',
        columnType: 'date',
        esTypes: ['date'],
        sortDirection: 'desc',
      },
    ],
    events: localMockedTimelineData,
    refetch: jest.fn(),
    totalCount: localMockedTimelineData.length,
    onEventClosed: jest.fn(),
    expandedDetail: {},
    showExpandedDetails: false,
    onChangePage: jest.fn(),
    dataLoadingState: DataLoadingState.loaded,
    updatedAt: Date.now(),
    isTextBasedQuery: false,
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

  return <UnifiedTimeline {...testComponentDefaultProps} {...props} />;
};

const customStore = createMockStore();

const TestProviderWrapperWithCustomStore: FC<PropsWithChildren<unknown>> = ({ children }) => {
  return <TestProviders store={customStore}>{children}</TestProviders>;
};

const renderTestComponents = (props?: Partial<ComponentProps<typeof TestComponent>>) => {
  return render(<TestComponent {...props} />, {
    wrapper: TestProviderWrapperWithCustomStore,
  });
};

const getTimelineFromStore = (
  store: ReturnType<typeof createMockStore>,
  timelineId: string = TimelineId.test
) => {
  return store.getState().timeline.timelineById[timelineId];
};

const loadPageMock = jest.fn();

const useTimelineEventsMock = jest.fn(() => [
  false,
  {
    events: localMockedTimelineData,
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

describe('unified timeline', () => {
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

  // Flaky : See https://github.com/elastic/kibana/issues/179831
  // removing/moving column current leads to infitinite loop, will be fixed in further PRs.
  describe.skip('columns', () => {
    it(
      'should move column left correctly ',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '3');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            `[data-gridcell-column-id="${field.name}"] .euiDataGridHeaderCell__icon`
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Move left')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Move left'));

        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns[0].id).toBe('message');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should move column right correctly ',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '3');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            `[data-gridcell-column-id="${field.name}"] .euiDataGridHeaderCell__icon`
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Move right')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Move right'));

        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns[2].id).toBe('message');
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it.skip(
      'should remove column ',
      async () => {
        const field = {
          name: 'message',
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

        // column is currently present in the state
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: field.name,
            }),
          ])
        );

        await waitFor(() => {
          expect(screen.getByTitle('Remove column')).toBeVisible();
        });

        fireEvent.click(screen.getByTitle('Remove column'));

        // column should now be removed
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).not.toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: field.name,
              }),
            ])
          );
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
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'asc',
            },
          ]);
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
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'desc',
            },
            {
              sortDirection: 'asc',
              columnId: 'host.name',
              columnType: 'string',
            },
          ]);
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
          const newSort = getTimelineFromStore(customStore).sort;
          expect(newSort).toMatchObject([
            {
              columnId: '@timestamp',
              columnType: 'date',
              sortDirection: 'desc',
            },
            {
              sortDirection: 'asc',
              columnId: 'event.severity',
              columnType: 'number',
            },
          ]);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be able to edit DataView Field',
      async () => {
        const field = {
          name: 'message',
        };
        const { container } = renderTestComponents();

        await waitFor(() => {
          expect(screen.getByTestId('discoverDocTable')).toBeVisible();
        });
        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toHaveAttribute('data-gridcell-column-index', '3');

        expect(
          container.querySelector(`[data-gridcell-column-id="${field.name}"]`)
        ).toBeInTheDocument();

        fireEvent.click(
          container.querySelector(
            `[data-gridcell-column-id="${field.name}"] .euiDataGridHeaderCell__icon`
          ) as HTMLElement
        );

        await waitFor(() => {
          expect(screen.getByTitle('Edit data view field')).toBeEnabled();
        });

        fireEvent.click(screen.getByTitle('Edit data view field'));

        await waitFor(() => {
          expect(kibanaServiceMock.dataViewFieldEditor.openEditor).toHaveBeenNthCalledWith(1, {
            ctx: {
              dataView: expect.objectContaining({
                id: 'security-solution',
              }),
            },
            fieldName: 'message',
            onSave: expect.any(Function),
          });
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  // FLAKY: https://github.com/elastic/kibana/issues/180937
  // FLAKY: https://github.com/elastic/kibana/issues/180956
  describe.skip('unified field list', () => {
    it(
      'should be able to add filters',
      async () => {
        const field = {
          name: 'event.severity',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toBeVisible();
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${field.name}`)).toHaveLength(1);

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        fireEvent.click(within(availableFields).getByTestId(`field-${field.name}-showDetails`));

        await waitFor(() => {
          expect(screen.getByTestId(`timelineFieldListPanelAddExistFilter-${field.name}`));
        });

        fireEvent.click(screen.getByTestId(`timelineFieldListPanelAddExistFilter-${field.name}`));
        await waitFor(() => {
          expect(
            kibanaServiceMock.timelineDataService.query.filterManager.addFilters
          ).toHaveBeenNthCalledWith(
            1,
            expect.arrayContaining([
              expect.objectContaining({
                query: {
                  exists: {
                    field: field.name,
                  },
                },
                meta: expect.objectContaining({
                  negate: false,
                  disabled: false,
                }),
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should add the column when clicked on + sign',
      async () => {
        const fieldToBeAdded = {
          name: 'agent.id',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toBeVisible();
        });

        expect(screen.getByTestId('fieldListGroupedSelectedFields-count')).toHaveTextContent('9');

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${fieldToBeAdded.name}`)).toHaveLength(
          0
        );

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        // / new columns does not exists yet
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).not.toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: fieldToBeAdded.name,
            }),
          ])
        );

        fireEvent.click(within(availableFields).getByTestId(`fieldToggle-${fieldToBeAdded.name}`));

        // new columns should exist now
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: fieldToBeAdded.name,
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should remove the column when clicked on X sign',
      async () => {
        const fieldToBeRemoved = {
          name: 'event.severity',
        };

        renderTestComponents();
        expect(await screen.findByTestId('timeline-sidebar')).toBeVisible();

        await waitFor(() => {
          expect(screen.getByTestId('fieldListGroupedAvailableFields-count')).toBeVisible();
        });

        expect(screen.queryAllByTestId(`dataGridHeaderCell-${fieldToBeRemoved.name}`)).toHaveLength(
          1
        );

        const availableFields = screen.getByTestId('fieldListGroupedAvailableFields');

        // new columns does exists
        const currentColumns = getTimelineFromStore(customStore).columns;
        expect(currentColumns).toMatchObject(
          expect.arrayContaining([
            expect.objectContaining({
              id: fieldToBeRemoved.name,
            }),
          ])
        );

        fireEvent.click(
          within(availableFields).getByTestId(`fieldToggle-${fieldToBeRemoved.name}`)
        );

        // new columns should not exist now
        await waitFor(() => {
          const newColumns = getTimelineFromStore(customStore).columns;
          expect(newColumns).not.toMatchObject(
            expect.arrayContaining([
              expect.objectContaining({
                id: fieldToBeRemoved.name,
              }),
            ])
          );
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});
