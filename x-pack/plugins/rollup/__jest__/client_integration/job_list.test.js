/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRouter } from '../../public/crud_app/services';
import { setupEnvironment, pageHelpers, nextTick } from './helpers';

jest.mock('ui/index_patterns', () => {
  const { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE } = require.requireActual('../../../../../src/legacy/ui/public/index_patterns/constants'); // eslint-disable-line max-len
  return { INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE };
});

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path ? path : 'api/rollup',
  breadcrumbs: { set: () => {} },
  getInjected: (key) => {
    if (key === 'uiCapabilities') {
      return {
        navLinks: {},
        management: {},
        catalogue: {}
      };
    }
    throw new Error(`Unexpected call to chrome.getInjected with key ${key}`);
  }
}));

jest.mock('../../public/crud_app/services', () => {
  const services = require.requireActual('../../public/crud_app/services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

const loadJobsMock = {
  jobs: [{
    config: {
      id: 'my-rollup-job',
      index_pattern: 'kibana_sample*',
      rollup_index: 'rollup-index',
      cron: '0 0 0 ? * 7',
      groups: {
        date_histogram: {
          interval: '24h',
          field: 'timestamp',
          delay: '1d',
          time_zone: 'UTC'
        }
      },
      metrics: [],
      timeout: '20s',
      page_size: 1000
    },
    status: {
      job_state: 'stopped',
      upgraded_doc_id: true
    },
    stats: {
      pages_processed: 0,
      documents_processed: 0,
      rollups_indexed: 0,
      trigger_count: 0,
      index_time_in_ms: 0,
      index_total: 0,
      index_failures: 0,
      search_time_in_ms: 0,
      search_total: 0,
      search_failures: 0
    }
  }]
};

const { setup } = pageHelpers.jobList;

describe('<JobList />', () => {
  describe('detail panel', () => {
    let server;
    let httpRequestsMockHelpers;
    let component;
    let table;
    let exists;

    beforeAll(() => {
      ({ server, httpRequestsMockHelpers } = setupEnvironment());
    });

    afterAll(() => {
      server.restore();
    });

    beforeEach(async () => {
      httpRequestsMockHelpers.setLoadJobsResponse(loadJobsMock);

      ({ component, exists, table } = setup());

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should open the detail panel when clicking on a job in the table', () => {
      const { rows } = table.getMetaData('rollupJobsListTable');
      const button = rows[0].columns[1].reactWrapper.find('button');

      expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

      button.simulate('click');

      expect(exists('rollupJobDetailFlyout')).toBe(true);
    });

    test('should add the Job id to the route query params when opening the detail panel', () => {
      const { rows } = table.getMetaData('rollupJobsListTable');
      const button = rows[0].columns[1].reactWrapper.find('button');

      expect(getRouter().history.location.search).toEqual('');

      button.simulate('click');

      const {
        jobs: [{
          config: { id: jobId },
        }],
      } = loadJobsMock;
      expect(getRouter().history.location.search).toEqual(`?job=${jobId}`);
    });

    test('should open the detail panel whenever a job id is added to the query params', () => {
      expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

      getRouter().history.replace({ search: `?job=bar` });

      component.update();

      expect(exists('rollupJobDetailFlyout')).toBe(true);
    });
  });
});
