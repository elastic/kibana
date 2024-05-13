/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, mockTimelineData, TestProviders } from '../../../../../common/mock';
import React from 'react';
import { TimelineDataTable } from '.';
import { defaultUdtHeaders } from '../default_headers';
import { TimelineId, TimelineTabs } from '../../../../../../common/types';
import { DataLoadingState } from '@kbn/unified-data-table';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import type { ComponentProps } from 'react';
import { getColumnHeaders } from '../../body/column_headers/helpers';
import { mockSourcererScope } from '../../../../../common/containers/sourcerer/mocks';
import { timelineActions } from '../../../../store';
import type { ExpandedDetailTimeline } from '../../../../../../common/types';

jest.mock('../../../../../common/containers/sourcerer');

const onFieldEditedMock = jest.fn();
const refetchMock = jest.fn();
const onEventClosedMock = jest.fn();
const onChangePageMock = jest.fn();

const initialEnrichedColumns = getColumnHeaders(
  defaultUdtHeaders,
  mockSourcererScope.browserFields
);

const initialEnrichedColumnsIds = initialEnrichedColumns.map((c) => c.id);

type TestComponentProps = Partial<ComponentProps<typeof TimelineDataTable>> & {
  store?: ReturnType<typeof createMockStore>;
};

// These tests can take more than standard timeout of 5s
// that is why we are setting it to 10s
const SPECIAL_TEST_TIMEOUT = 10000;

const TestComponent = (props: TestComponentProps) => {
  const { store = createMockStore(), ...restProps } = props;
  useSourcererDataView();
  return (
    <TestProviders store={store}>
      <TimelineDataTable
        columns={initialEnrichedColumns}
        columnIds={initialEnrichedColumnsIds}
        activeTab={TimelineTabs.query}
        timelineId={TimelineId.test}
        itemsPerPage={50}
        itemsPerPageOptions={[10, 25, 50, 100]}
        rowRenderers={[]}
        leadingControlColumns={[]}
        sort={[['@timestamp', 'desc']]}
        events={mockTimelineData}
        onFieldEdited={onFieldEditedMock}
        refetch={refetchMock}
        dataLoadingState={DataLoadingState.loaded}
        totalCount={mockTimelineData.length}
        onEventClosed={onEventClosedMock}
        showExpandedDetails={false}
        expandedDetail={{}}
        onChangePage={onChangePageMock}
        updatedAt={Date.now()}
        onSetColumns={jest.fn()}
        onFilter={jest.fn()}
        {...restProps}
      />
    </TestProviders>
  );
};

const getTimelineFromStore = (
  store: ReturnType<typeof createMockStore>,
  timelineId: string = TimelineId.test
) => {
  return store.getState().timeline.timelineById[timelineId];
};

// FLAKY: https://github.com/elastic/kibana/issues/179843
describe.skip('unified data table', () => {
  beforeEach(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue(mockSourcererScope);
  });

  it(
    'should display unified data table',
    async () => {
      render(<TestComponent />);
      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
    },
    SPECIAL_TEST_TIMEOUT
  );

  describe('custom cell rendering based on data Type', () => {
    it(
      'should render source.ip as link',
      async () => {
        const eventsWithSourceIp = mockTimelineData.filter(
          (event) => event.ecs?.source?.ip?.length ?? -1 > 0
        );

        const { container } = render(<TestComponent events={eventsWithSourceIp} />);

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        const sourceIpCell = container.querySelector(
          '[data-gridcell-column-id="source.ip"][data-test-subj="dataGridRowCell"]'
        ) as HTMLElement;

        expect(sourceIpCell).toBeVisible();

        expect(within(sourceIpCell).getByTestId('network-details')).toHaveClass('euiLink');
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should render destination.ip as link',
      async () => {
        const eventsWithDestIp = mockTimelineData.filter(
          (event) => event.ecs?.destination?.ip?.length ?? -1 > 0
        );

        const { container } = render(<TestComponent events={eventsWithDestIp} />);

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        const destIpCell = container.querySelector(
          '[data-gridcell-column-id="destination.ip"][data-test-subj="dataGridRowCell"]'
        ) as HTMLElement;

        expect(destIpCell).toBeVisible();

        expect(within(destIpCell).getByTestId('network-details')).toHaveClass('euiLink');
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should render host.name as link',
      async () => {
        const hostTestId = 'host-details-button';
        const eventsWithHostName = mockTimelineData.filter(
          (event) => event.ecs?.host?.name?.length ?? -1 > 0
        );

        const { container } = render(<TestComponent events={eventsWithHostName} />);

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        const hostNameCell = container.querySelector(
          '[data-gridcell-column-id="host.name"][data-test-subj="dataGridRowCell"]'
        ) as HTMLElement;

        expect(hostNameCell).toBeVisible();

        expect(within(hostNameCell).getByTestId(hostTestId)).toHaveClass('euiLink');
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should render user.name as link',
      async () => {
        const userTestId = 'users-link-anchor';
        const eventsWithUserName = mockTimelineData.filter(
          (event) => event.ecs?.user?.name?.length ?? -1 > 0
        );

        const { container } = render(<TestComponent events={eventsWithUserName} />);

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        const userNameCell = container.querySelector(
          '[data-gridcell-column-id="user.name"][data-test-subj="dataGridRowCell"]'
        ) as HTMLElement;

        expect(userNameCell).toBeVisible();

        expect(within(userNameCell).getByTestId(userTestId)).toHaveClass('euiLink');
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  it(
    'should refetch on sample size change',
    async () => {
      render(<TestComponent />);

      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

      const toolbarSettings = screen.getByTestId('dataGridDisplaySelectorButton');

      fireEvent.click(toolbarSettings);

      await waitFor(() => {
        expect(screen.getAllByTestId('unifiedDataTableSampleSizeInput')[0]).toBeVisible();
      });

      fireEvent.change(screen.getAllByTestId('unifiedDataTableSampleSizeInput')[0], {
        target: { value: '10' },
      });

      await waitFor(() => {
        expect(refetchMock).toHaveBeenCalledTimes(1);
      });
    },
    SPECIAL_TEST_TIMEOUT
  );

  it(
    'should update row Height correctly',
    async () => {
      const rowHeight = {
        initial: 2,
        new: 1,
      };
      const customMockStore = createMockStore();

      customMockStore.dispatch(
        timelineActions.updateRowHeight({
          id: TimelineId.test,
          rowHeight: rowHeight.initial,
        })
      );

      render(<TestComponent store={customMockStore} />);

      expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

      const toolbarSettings = screen.getByTestId('dataGridDisplaySelectorButton');

      fireEvent.click(toolbarSettings);

      await waitFor(() => {
        expect(
          screen.getAllByTestId('unifiedDataTableRowHeightSettings_lineCountNumber')[0]
        ).toBeVisible();
      });
      expect(
        screen.getAllByTestId('unifiedDataTableRowHeightSettings_lineCountNumber')[0]
      ).toHaveValue(String(rowHeight.initial));

      fireEvent.change(
        screen.getAllByTestId('unifiedDataTableRowHeightSettings_lineCountNumber')[0],
        {
          target: { value: String(rowHeight.new) },
        }
      );

      await waitFor(() => {
        expect(getTimelineFromStore(customMockStore)?.rowHeight).toEqual(rowHeight.new);
      });
    },
    SPECIAL_TEST_TIMEOUT
  );

  describe('details flyout', () => {
    it(
      'should show defails flyout when clicked on expand event',
      async () => {
        render(<TestComponent showExpandedDetails={true} />);

        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();

        fireEvent.click(screen.getAllByTestId('docTableExpandToggleColumn')[0]);

        await waitFor(() => {
          expect(screen.getByTestId('timeline:details-panel:flyout')).toBeVisible();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should show details flyout when expandedDetails state is set',
      async () => {
        const customMockStore = createMockStore();
        const mockExpandedDetail: ExpandedDetailTimeline = {
          query: {
            params: {
              eventId: 'some_id',
              indexName: 'security-*',
            },
            panelView: 'eventDetail',
          },
        };
        customMockStore.dispatch(
          timelineActions.toggleDetailPanel({
            id: TimelineId.test,
            tabType: TimelineTabs.query,
            ...mockExpandedDetail.query,
          })
        );

        render(
          <TestComponent
            store={customMockStore}
            showExpandedDetails={true}
            expandedDetail={mockExpandedDetail}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('timeline:details-panel:flyout')).toBeVisible();
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
    it(
      'should close details flyout when close icon is clicked',
      async () => {
        const customMockStore = createMockStore();
        const mockExpandedDetail: ExpandedDetailTimeline = {
          query: {
            params: {
              eventId: 'some_id',
              indexName: 'security-*',
            },
            panelView: 'eventDetail',
          },
        };

        customMockStore.dispatch(
          timelineActions.toggleDetailPanel({
            id: TimelineId.test,
            tabType: TimelineTabs.query,
            ...mockExpandedDetail.query,
          })
        );

        render(
          <TestComponent
            store={customMockStore}
            showExpandedDetails={true}
            expandedDetail={mockExpandedDetail}
          />
        );

        await waitFor(() => {
          expect(screen.getByTestId('euiFlyoutCloseButton')).toBeVisible();
        });

        fireEvent.click(screen.getByTestId('euiFlyoutCloseButton'));
        expect(onEventClosedMock).toHaveBeenCalledTimes(1);
      },
      SPECIAL_TEST_TIMEOUT
    );
  });

  describe('pagination', () => {
    // change the number of items per page
    it(
      'should change the number of items per page',
      async () => {
        const customMockStore = createMockStore();
        render(<TestComponent store={customMockStore} />);
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
        // make sure that items per page is as per the props passed above
        expect(screen.getByTestId('tablePaginationPopoverButton')).toHaveTextContent(
          `Rows per page: 50`
        );
        fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
        fireEvent.click(screen.getByTestId(`tablePagination-25-rows`));
        await waitFor(() => {
          expect(getTimelineFromStore(customMockStore)?.itemsPerPage).toEqual(25);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );

    it(
      'should be able to load more records once user have seen all the records loaded according to sample size',
      async () => {
        const customMockStore = createMockStore();
        customMockStore.dispatch(
          timelineActions.updateSampleSize({
            id: TimelineId.test,
            sampleSize: 10,
          })
        );
        render(
          <TestComponent
            store={customMockStore}
            itemsPerPage={25}
            events={structuredClone(mockTimelineData).slice(0, 10)}
          />
        );
        expect(await screen.findByTestId('discoverDocTable')).toBeVisible();
        expect(screen.getByTestId('dscGridSampleSizeFetchMoreLink')).toBeVisible();
        fireEvent.click(screen.getByTestId('dscGridSampleSizeFetchMoreLink'));
        await waitFor(() => {
          expect(onChangePageMock).toHaveBeenNthCalledWith(1, 1);
        });
      },
      SPECIAL_TEST_TIMEOUT
    );
  });
});
