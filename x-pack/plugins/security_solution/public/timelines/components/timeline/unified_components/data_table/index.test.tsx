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
import { render, screen, waitFor } from '@testing-library/react';
import { useSourcererDataView } from '../../../../../common/containers/sourcerer';
import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import type { ComponentProps } from 'react';
const mockDataView = createStubDataView({ spec: {} });

jest.mock('../../../../../common/containers/sourcerer');

const onFieldEditedMock = jest.fn();
const refetchMock = jest.fn();
const onEventClosedMock = jest.fn();
const onChangePageMock = jest.fn();

const TestComponent = (props: Partial<ComponentProps<typeof TimelineDataTableComponent>>) => {
  useSourcererDataView();
  return (
    <TestProviders>
      <TimelineDataTableComponent
        columns={defaultUdtHeaders}
        dataView={mockDataView}
        activeTab={TimelineTabs.query}
        timelineId={TimelineId.test}
        itemsPerPage={100}
        itemsPerPageOptions={[10, 25, 50, 100]}
        rowRenderers={[]}
        sort={[
          {
            columnId: '@timestamp',
            columnType: 'date',
            esTypes: ['date'],
            sortDirection: 'desc',
          },
        ]}
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
    screen.debug(undefined, 100000);
    expect(screen.getByTestId('discoverDocTable')).toBeVisible();
  });

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
    screen.debug(undefined, 1000000);

    await waitFor(() => {
      expect(screen.getByTestId('timeline:details-panel:flyout')).toBeVisible();
    });
  });
});
