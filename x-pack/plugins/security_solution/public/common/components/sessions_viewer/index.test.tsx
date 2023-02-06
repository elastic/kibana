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
import type { EntityType } from '@kbn/timelines-plugin/common';
import type { SessionsComponentsProps } from './types';
import { useGetUserCasesPermissions } from '../../lib/kibana';
import { TableId } from '../../../../common/types';
import { licenseService } from '../../hooks/use_license';
import { mount } from 'enzyme';
import type { EventsViewerProps } from '../events_viewer';

jest.mock('../../lib/kibana');

const originalKibanaLib = jest.requireActual('../../lib/kibana');

// Restore the useGetUserCasesPermissions so the calling functions can receive a valid permissions object
// The returned permissions object will indicate that the user does not have permissions by default
const mockUseGetUserCasesPermissions = useGetUserCasesPermissions as jest.Mock;
mockUseGetUserCasesPermissions.mockImplementation(originalKibanaLib.useGetUserCasesPermissions);

jest.mock('../../utils/normalize_time_range');

const startDate = '2022-03-22T22:10:56.794Z';
const endDate = '2022-03-21T22:10:56.791Z';

const filterQuery =
  '{"bool":{"must":[],"filter":[{"match_phrase":{"host.name":{"query":"ubuntu-impish"}}}],"should":[],"must_not":[]}}';

const testProps: SessionsComponentsProps = {
  tableId: TableId.hostsPageSessions,
  entityType: 'sessions',
  pageFilters: [],
  startDate,
  endDate,
  filterQuery,
};

type Props = Partial<EventsViewerProps> & {
  start: string;
  end: string;
  entityType: EntityType;
};

const mockGetDefaultControlColumn = jest.fn();
jest.mock('../../../timelines/components/timeline/body/control_columns', () => ({
  getDefaultControlColumn: (props: number) => mockGetDefaultControlColumn(props),
}));

const TEST_PREFIX = 'security_solution:sessions_viewer:sessions_view';

const callFilters = jest.fn();

jest.mock('../../hooks/use_license', () => {
  const licenseServiceInstance = {
    isPlatinumPlus: jest.fn(),
    isEnterprise: jest.fn(() => false),
  };
  return {
    licenseService: licenseServiceInstance,
    useLicense: () => {
      return licenseServiceInstance;
    },
  };
});

// creating a dummy component for testing data table to avoid mocking all the implementation details
// but still test if the data table will render properly
const SessionsViewerEventsViewer: React.FC<Props> = ({
  defaultModel,
  start,
  end,
  tableId,
  pageFilters,
  entityType,
}) => {
  useEffect(() => {
    callFilters(pageFilters);
  }, [pageFilters]);

  return (
    <div>
      <div data-test-subj={`${TEST_PREFIX}:entityType`}>{entityType}</div>
      <div data-test-subj={`${TEST_PREFIX}:startDate`}>{start}</div>
      <div data-test-subj={`${TEST_PREFIX}:endDate`}>{end}</div>
      <div data-test-subj={`${TEST_PREFIX}:timelineId`}>{tableId}</div>
      {defaultModel?.columns?.map((header) => (
        <div key={header.id}>{header.display ?? header.id}</div>
      ))}
    </div>
  );
};

jest.mock('../events_viewer', () => {
  return {
    StatefulEventsViewer: SessionsViewerEventsViewer,
  };
});

mockGetDefaultControlColumn.mockReturnValue([
  {
    headerCellRender: () => <></>,
    id: 'default-timeline-control-column',
    rowCellRender: jest.fn(),
    width: jest.fn(),
  },
]);

describe('SessionsView', () => {
  it('renders the session view', async () => {
    const wrapper = mount(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(wrapper.find(`[data-test-subj="${TEST_ID}"]`).exists()).toBeTruthy();
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

  it('passes in the right parameters to EventsViewer', async () => {
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
        'hosts-page-sessions-v2'
      );
    });
  });

  it('passes in the right filters to EventsViewer', async () => {
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
  it('Action tab should have 4 columns for non Enterprise users', async () => {
    render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(4);
    });
  });

  it('Action tab should have 5 columns for Enterprise or above users', async () => {
    const licenseServiceMock = licenseService as jest.Mocked<typeof licenseService>;

    licenseServiceMock.isEnterprise.mockReturnValue(true);
    render(
      <TestProviders>
        <SessionsView {...testProps} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(5);
    });
  });

  it('Action tab should have 5 columns when accessed via K8S dahsboard', async () => {
    render(
      <TestProviders>
        <SessionsView {...testProps} tableId={TableId.kubernetesPageSessions} />
      </TestProviders>
    );

    await waitFor(() => {
      expect(mockGetDefaultControlColumn).toHaveBeenCalledWith(5);
    });
  });
});
