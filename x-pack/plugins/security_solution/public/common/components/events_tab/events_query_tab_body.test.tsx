/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { TimelineId } from '../../../../common/types';
import { HostsType } from '../../../hosts/store/model';
import { TestProviders } from '../../mock';
import type { EventsQueryTabBodyComponentProps } from './events_query_tab_body';
import { EventsQueryTabBody, ALERTS_EVENTS_HISTOGRAM_ID } from './events_query_tab_body';
import { useGlobalFullScreen } from '../../containers/use_full_screen';
import * as tGridActions from '@kbn/timelines-plugin/public/store/t_grid/actions';

jest.mock('../../lib/kibana', () => {
  const original = jest.requireActual('../../lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      services: {
        ...original.useKibana().services,
        cases: {
          ui: {
            getCasesContext: jest.fn(),
          },
        },
      },
    }),
  };
});

const FakeStatefulEventsViewer = ({ additionalFilters }: { additionalFilters: JSX.Element }) => (
  <div>
    {additionalFilters}
    {'MockedStatefulEventsViewer'}
  </div>
);
jest.mock('../events_viewer', () => ({ StatefulEventsViewer: FakeStatefulEventsViewer }));

jest.mock('../../containers/use_full_screen', () => ({
  useGlobalFullScreen: jest.fn().mockReturnValue({
    globalFullScreen: false,
  }),
}));

describe('EventsQueryTabBody', () => {
  const commonProps: EventsQueryTabBodyComponentProps = {
    indexNames: ['test-index'],
    setQuery: jest.fn(),
    timelineId: TimelineId.test,
    type: HostsType.page,
    endDate: new Date('2000').toISOString(),
    startDate: new Date('2000').toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders EventsViewer', () => {
    const { queryByText } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByText('MockedStatefulEventsViewer')).toBeInTheDocument();
  });

  it('renders the matrix histogram when globalFullScreen is false', () => {
    (useGlobalFullScreen as jest.Mock).mockReturnValueOnce({
      globalFullScreen: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId(`${ALERTS_EVENTS_HISTOGRAM_ID}Panel`)).toBeInTheDocument();
  });

  it("doesn't render the matrix histogram when globalFullScreen is true", () => {
    (useGlobalFullScreen as jest.Mock).mockReturnValueOnce({
      globalFullScreen: true,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId(`${ALERTS_EVENTS_HISTOGRAM_ID}Panel`)).not.toBeInTheDocument();
  });

  it('renders the matrix histogram stacked by events default value', () => {
    const result = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(result.getByTestId('header-section-supplements').querySelector('select')?.value).toEqual(
      'event.action'
    );
  });

  it('renders the matrix histogram stacked by alerts default value', () => {
    const result = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    result.getByTestId('showExternalAlertsCheckbox').click();

    expect(result.getByTestId('header-section-supplements').querySelector('select')?.value).toEqual(
      'event.module'
    );
  });

  it('deletes query when unmouting', () => {
    const mockDeleteQuery = jest.fn();
    const { unmount } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} deleteQuery={mockDeleteQuery} />
      </TestProviders>
    );
    unmount();

    expect(mockDeleteQuery).toHaveBeenCalled();
  });

  it('initializes t-grid', () => {
    const spy = jest.spyOn(tGridActions, 'initializeTGridSettings');
    render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(spy).toHaveBeenCalled();
  });
});
