/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import useResizeObserver from 'use-resize-observer/polyfilled';

import { mockIndexPattern } from '../../../common/mock/index_pattern';
import { TestProviders } from '../../../common/mock/test_providers';
import { HostDetailsTabs } from './details_tabs';
import { HostDetailsTabsProps, SetAbsoluteRangeDatePicker } from './types';
import { hostDetailsPagePath } from '../types';
import { type } from './utils';
import { useMountAppended } from '../../../common/utils/use_mount_appended';
import { getHostDetailsPageFilters } from './helpers';

jest.mock('../../../common/containers/source', () => ({
  useWithSource: jest.fn().mockReturnValue({ indicesExist: true, indexPattern: mockIndexPattern }),
}));

jest.mock('../../../common/containers/use_global_time', () => ({
  useGlobalTime: jest
    .fn()
    .mockReturnValue({ from: 0, isInitializing: false, to: 0, setQuery: jest.fn() }),
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

describe('body', () => {
  const scenariosMap = {
    authentications: 'AuthenticationsQueryTabBody',
    allHosts: 'HostsQueryTabBody',
    uncommonProcesses: 'UncommonProcessQueryTabBody',
    anomalies: 'AnomaliesQueryTabBody',
    events: 'EventsQueryTabBody',
    alerts: 'HostAlertsQueryTabBody',
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
          <MemoryRouter initialEntries={[`/host-1/${path}`]}>
            <HostDetailsTabs
              from={0}
              isInitializing={false}
              detailName={'host-1'}
              setQuery={jest.fn()}
              to={0}
              setAbsoluteRangeDatePicker={(jest.fn() as unknown) as SetAbsoluteRangeDatePicker}
              hostDetailsPagePath={hostDetailsPagePath}
              indexPattern={mockIndexPattern}
              type={type}
              pageFilters={mockHostDetailsPageFilters}
              filterQuery={filterQuery}
            />
          </MemoryRouter>
        </TestProviders>
      );

      // match against everything but the functions to ensure they are there as expected
      expect(wrapper.find(componentName).props()).toMatchObject({
        endDate: 0,
        filterQuery,
        skip: false,
        startDate: 0,
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
          ],
          title: 'filebeat-*,auditbeat-*,packetbeat-*',
        },
        hostName: 'host-1',
        ...(componentProps[path] != null ? componentProps[path] : []),
      });
    })
  );
});
