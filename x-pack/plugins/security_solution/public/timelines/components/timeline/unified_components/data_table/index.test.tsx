/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockTimelineData, TestProviders } from '../../../../../common/mock';
import React from 'react';
import { TimelineDataTableComponent } from '.';
import { defaultUdtHeaders } from '../default_headers';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { TimelineId, TimelineTabs } from '../../../../../../common/types';
import { DataLoadingState } from '@kbn/unified-data-table';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import type { ComponentProps } from 'react';
import { getColumnHeaders } from '../../body/column_headers/helpers';
import { mockSourcererScope } from '../../../../../common/containers/sourcerer/mocks';
const mockDataView = createStubDataView({ spec: {} });

jest.mock('../../../../../common/containers/sourcerer');

const onFieldEditedMock = jest.fn();
const refetchMock = jest.fn();
const onEventClosedMock = jest.fn();
const onChangePageMock = jest.fn();

const initialEnrichedColumns = getColumnHeaders(
  defaultUdtHeaders,
  mockSourcererScope.browserFields
);

const TestComponent = (props: Partial<ComponentProps<typeof TimelineDataTableComponent>>) => {
  useSourcererDataView();
  return (
    <TestProviders>
      <TimelineDataTableComponent
        columns={initialEnrichedColumns}
        dataView={mockDataView}
        activeTab={TimelineTabs.query}
        timelineId={TimelineId.test}
        itemsPerPage={100}
        itemsPerPageOptions={[10, 25, 50, 100]}
        rowRenderers={[]}
        sort={[['@timestamp', 'desc']]}
        events={mockTimelineData}
        onFieldEdited={onFieldEditedMock}
        refetch={refetchMock}
        dataLoadingState={DataLoadingState.loaded}
        totalCount={1}
        onEventClosed={onEventClosedMock}
        showExpandedDetails={false}
        expandedDetail={{}}
        onChangePage={onChangePageMock}
        updatedAt={Date.now()}
        onSetColumns={jest.fn()}
        onFilter={jest.fn()}
        {...props}
      />
    </TestProviders>
  );
};

describe('unified data table', () => {
  beforeAll(() => {
    (useSourcererDataView as jest.Mock).mockReturnValue({
      browserFields: mockBrowserFields,
      runtimeMappings: {},
    });
  });

  it('should display unified data table', () => {
    render(<TestComponent />);
    expect(screen.getByTestId('discoverDocTable')).toBeVisible();
  });

  describe('custom cell rendering based on data Type', () => {
    it('should render source.ip as link', async () => {
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
    });
    it('should render destination.ip as link', async () => {
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
    });
    it('should render host.name as link', async () => {
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
    });
    it('should render user.name as link', async () => {
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
    });
  });

  it('should refetch on sample size change', async () => {
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
  });

  describe('details flyout', () => {
    it('should show details flyout', async () => {
      render(
        <TestComponent
          showExpandedDetails={true}
          expandedDetail={{
            query: {
              params: {
                eventId: 'some_id',
                indexName: '',
              },
              panelView: 'eventDetail',
            },
          }}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('timeline:details-panel:flyout')).toBeVisible();
      });
    });
    it('should close details flyout', async () => {});
  });
});
