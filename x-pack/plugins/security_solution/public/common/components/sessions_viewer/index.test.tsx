/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { waitFor, render } from '@testing-library/react';
import { TestProviders } from '../../mock';
import { TEST_ID, SessionsView, defaultSessionsFilter } from '.';
import { EntityType, TimelineId } from '../../../../../timelines/common';
import { SessionsComponentsProps } from './types';
import { TimelineModel } from '../../../timelines/store/timeline/model';

jest.mock('../../../common/lib/kibana');

jest.mock('../../components/url_state/normalize_time_range.ts');

const startDate = '2022-03-22T22:10:56.794Z';
const endDate = '2022-03-21T22:10:56.791Z';

const filterQuery =
  '{"bool":{"must":[],"filter":[{"match_phrase":{"host.name":{"query":"ubuntu-impish"}}}],"should":[],"must_not":[]}}';

const testProps: SessionsComponentsProps = {
  timelineId: TimelineId.hostsPageSessions,
  entityType: 'sessions',
  pageFilters: [],
  startDate,
  endDate,
  filterQuery,
};

type Props = Partial<TimelineModel> & {
  start: string;
  end: string;
  entityType: EntityType;
};

const TEST_PREFIX = 'security_solution:sessions_viewer:sessions_view';

const callFilters = jest.fn();

// creating a dummy component for testing TGrid to avoid mocking all the implementation details
// but still test if the TGrid will render properly
const SessionsViewerTGrid: React.FC<Props> = ({ columns, start, end, id, filters, entityType }) => {
  useEffect(() => {
    callFilters(filters);
  }, [filters]);

  return (
    <div>
      <div data-test-subj={`${TEST_PREFIX}:entityType`}>{entityType}</div>
      <div data-test-subj={`${TEST_PREFIX}:startDate`}>{start}</div>
      <div data-test-subj={`${TEST_PREFIX}:endDate`}>{end}</div>
      <div data-test-subj={`${TEST_PREFIX}:timelineId`}>{id}</div>
      {columns?.map((header) => (
        <div key={header.id}>{header.display ?? header.id}</div>
      ))}
    </div>
  );
};

jest.mock('../../../../../timelines/public/mock/plugin_mock.tsx', () => {
  const originalModule = jest.requireActual('../../../../../timelines/public/mock/plugin_mock.tsx');
  return {
    ...originalModule,
    createTGridMocks: () => ({
      ...originalModule.createTGridMocks,
      getTGrid: SessionsViewerTGrid,
    }),
  };
});

describe('SessionsView', () => {
  it('renders the session view', async () => {
    const wrapper = render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.queryByTestId(TEST_ID)).toBeInTheDocument();
    });
  });

  it('renders correctly against snapshot', async () => {
    const { asFragment } = render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(asFragment()).toMatchSnapshot();
    });
  });

  it('passes in the right parameters to TGrid', async () => {
    const wrapper = render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(wrapper.getByTestId(`${TEST_PREFIX}:entityType`)).toHaveTextContent('sessions');
      expect(wrapper.getByTestId(`${TEST_PREFIX}:startDate`)).toHaveTextContent(startDate);
      expect(wrapper.getByTestId(`${TEST_PREFIX}:endDate`)).toHaveTextContent(endDate);
      expect(wrapper.getByTestId(`${TEST_PREFIX}:timelineId`)).toHaveTextContent(
        'hosts-page-sessions'
      );
    });
  });
  it('passes in the right filters to TGrid', async () => {
    render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );
    await waitFor(() => {
      expect(callFilters).toHaveBeenCalledWith([
        {
          ...defaultSessionsFilter,
          query: {
            ...defaultSessionsFilter.query,
            bool: {
              ...defaultSessionsFilter.query.bool,
              filter: defaultSessionsFilter.query.bool.filter.concat(JSON.parse(filterQuery)),
            },
          },
        },
      ]);
    });
  });
});
