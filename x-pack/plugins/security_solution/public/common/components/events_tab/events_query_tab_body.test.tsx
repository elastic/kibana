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
import { EventsQueryTabBody, EventsQueryTabBodyComponentProps } from './events_query_tab_body';
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

const FakeStatefulEventsViewer = () => <div>{'MockedStatefulEventsViewer'}</div>;
jest.mock('../events_viewer', () => ({ StatefulEventsViewer: FakeStatefulEventsViewer }));

jest.mock('../../containers/use_full_screen', () => ({
  useGlobalFullScreen: jest.fn().mockReturnValue({
    globalFullScreen: true,
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

  it('renders EventsViewer', () => {
    const { queryByText } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByText('MockedStatefulEventsViewer')).toBeInTheDocument();
  });

  it('renders the matrix histogram when globalFullScreen is false', () => {
    (useGlobalFullScreen as jest.Mock).mockReturnValue({
      globalFullScreen: false,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId('eventsHistogramQueryPanel')).toBeInTheDocument();
  });

  it("doesn't render the matrix histogram when globalFullScreen is true", () => {
    (useGlobalFullScreen as jest.Mock).mockReturnValue({
      globalFullScreen: true,
    });

    const { queryByTestId } = render(
      <TestProviders>
        <EventsQueryTabBody {...commonProps} />
      </TestProviders>
    );

    expect(queryByTestId('eventsHistogramQueryPanel')).not.toBeInTheDocument();
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
