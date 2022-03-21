/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useResizeObserver from 'use-resize-observer/polyfilled';

import '../../../common/mock/match_media';
import { mockIndexPattern, TestProviders } from '../../../common/mock';
import { HostDetailsTabs } from './details_tabs';
import { HostDetailsTabsProps, SetAbsoluteRangeDatePicker } from './types';
import { hostDetailsPagePath } from '../types';
import { type } from './utils';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { getHostDetailsPageFilters } from './helpers';
import { HostsTableType } from '../../store/model';
import { mockCasesContract } from '../../../../../cases/public/mocks';

jest.mock('../../../common/lib/kibana', () => {
  const original = jest.requireActual('../../../common/lib/kibana');

  return {
    ...original,
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        cases: mockCasesContract(),
        timelines: { getTGrid: jest.fn().mockReturnValue(() => <></>) },
      },
    }),
  };
});

jest.mock('../../../common/components/url_state/normalize_time_range.ts');

jest.mock('../../../common/containers/source', () => ({
  useFetchIndex: () => [false, { indicesExist: true, indexPatterns: mockIndexPattern }],
}));

jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest.fn().mockReturnValue({
    from: '2020-07-07T08:20:18.966Z',
    isInitializing: false,
    to: '2020-07-08T08:20:18.966Z',
    setQuery: jest.fn(),
  }),
}));

// Test will fail because we will to need to mock some core services to make the test work
// For now let's forget about SiemSearchBar and QueryBar
jest.mock('../../../common/components/search_bar', () => ({
  SiemSearchBar: () => null,
}));
jest.mock('../../../common/components/query_bar', () => ({
  QueryBar: () => null,
}));

const mockUseResizeObserver: jest.Mock = useResizeObserver as jest.Mock;
jest.mock('use-resize-observer/polyfilled');
mockUseResizeObserver.mockImplementation(() => ({}));
jest.mock('../../../common/components/visualization_actions', () => ({
  VisualizationActions: jest.fn(() => <div data-test-subj="mock-viz-actions" />),
}));

describe('body', () => {
  const scenariosMap = {
    [HostsTableType.authentications]: 'AuthenticationsQueryTabBody',
    [HostsTableType.hosts]: 'HostsQueryTabBody',
    [HostsTableType.uncommonProcesses]: 'UncommonProcessQueryTabBody',
    [HostsTableType.anomalies]: 'AnomaliesQueryTabBody',
    [HostsTableType.events]: 'EventsQueryTabBody',
    [HostsTableType.alerts]: 'HostAlertsQueryTabBody',
  };

  const mockHostDetailsPageFilters = getHostDetailsPageFilters('host-1');

  const filterQuery = JSON.stringify({
    bool: {
      must: [],
      filter: [{ match_all: {} }, { match_phrase: { 'host.name': { query: 'host-1' } } }],
      should: [],
      must_not: [],
    },
  });

  const componentProps: Record<string, Partial<HostDetailsTabsProps>> = {
    events: { pageFilters: mockHostDetailsPageFilters },
    alerts: { pageFilters: mockHostDetailsPageFilters },
  };
  const mount = useMountAppended();

  Object.entries(scenariosMap).forEach(([path, componentName]) =>
    test(`it should pass expected object properties to ${componentName}`, () => {
      const wrapper = mount(
        <TestProviders>
          <MemoryRouter initialEntries={[`/hosts/host-1/${path}`]}>
            <HostDetailsTabs
              isInitializing={false}
              detailName={'host-1'}
              setQuery={jest.fn()}
              setAbsoluteRangeDatePicker={jest.fn() as unknown as SetAbsoluteRangeDatePicker}
              hostDetailsPagePath={hostDetailsPagePath}
              indexNames={[]}
              indexPattern={mockIndexPattern}
              type={type}
              pageFilters={mockHostDetailsPageFilters}
              filterQuery={filterQuery}
              from={'2020-07-07T08:20:18.966Z'}
              to={'2020-07-08T08:20:18.966Z'}
            />
          </MemoryRouter>
        </TestProviders>
      );

      // match against everything but the functions to ensure they are there as expected
      expect(wrapper.find(componentName).props()).toMatchObject({
        endDate: '2020-07-08T08:20:18.966Z',
        filterQuery,
        skip: false,
        startDate: '2020-07-07T08:20:18.966Z',
        type: 'details',
        indexPattern: {
          fields: [
            { name: '@timestamp', searchable: true, type: 'date', aggregatable: true },
            { name: '@version', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.ephemeral_id', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.hostname', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.id', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test1', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test2', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test3', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test4', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test5', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test6', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test7', searchable: true, type: 'string', aggregatable: true },
            { name: 'agent.test8', searchable: true, type: 'string', aggregatable: true },
            { name: 'host.name', searchable: true, type: 'string', aggregatable: true },
            {
              aggregatable: false,
              name: 'nestedField.firstAttributes',
              searchable: true,
              type: 'string',
            },
            {
              aggregatable: false,
              name: 'nestedField.secondAttributes',
              searchable: true,
              type: 'string',
            },
          ],
          title: 'filebeat-*,auditbeat-*,packetbeat-*',
        },
        hostName: 'host-1',
        ...(componentProps[path] != null ? componentProps[path] : []),
      });
    })
  );
});
