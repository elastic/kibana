/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import sinon from 'sinon';
import axios from 'axios';

import { registerTestBed, nextTick } from '../../../../test_utils';
import { createRollupJobsStore } from '../../public/crud_app/store';
import { setHttp, registerRouter, getRouter } from '../../public/crud_app/services';
import { JobList } from '../../public/crud_app/sections/job_list';

// axios has a $http like interface so using it to simulate $http
setHttp(axios.create());

jest.mock('ui/chrome', () => ({
  addBasePath: (path) => path ? path : 'api/rollup',
  breadcrumbs: { set: () => {} },
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

describe('<JobList />', () => {
  describe('detail panel', () => {
    let server;
    let component;
    let getMetadataFromEuiTable;
    let exists;

    const testBedOptions = {
      memoryRouter: {
        onRouter: (router) =>  {
          // register our react memory router
          registerRouter(router);
        }
      }
    };

    beforeEach(async () => {
      server = sinon.fakeServer.create();
      server.respondImmediately = true;

      // Mock load job list
      server.respondWith('GET', '/api/rollup/jobs', [
        200,
        { 'Content-Type': 'application/json' },
        JSON.stringify(loadJobsMock),
      ]);

      // Mock all user actions tracking
      server.respondWith('POST', /\/api\/user_action/, [200, { 'Content-Type': 'application/json' }, '']);

      const initTestBed = registerTestBed(JobList, {}, createRollupJobsStore());
      ({ component, exists, getMetadataFromEuiTable } = initTestBed(undefined, testBedOptions));

      await nextTick(); // We need to wait next tick for the mock server response to comes in
      component.update();
    });

    test('should open the detail panel when clicking on a job in the table', () => {
      const { rows } = getMetadataFromEuiTable('rollupJobsListTable');
      const button = rows[0].columns[1].reactWrapper.find('button');

      expect(exists('rollupJobDetailFlyout')).toBe(false); // make sure it is not shown

      button.simulate('click');

      expect(exists('rollupJobDetailFlyout')).toBe(true);
    });

    test('should add the Job id to the route query params when opening the detail panel', () => {
      const { rows } = getMetadataFromEuiTable('rollupJobsListTable');
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
