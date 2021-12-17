/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpRequest, pageHelpers } from './helpers';

import { act } from 'react-dom/test-utils';
import { getRouter, setHttp, init as initDocumentation } from '../../crud_app/services';
import { JOBS } from './helpers/constants';
import { coreMock, docLinksServiceMock } from '../../../../../../src/core/public/mocks';

jest.mock('../../crud_app/services', () => {
  const services = jest.requireActual('../../crud_app/services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

jest.mock('../../kibana_services', () => {
  const services = jest.requireActual('../../kibana_services');
  return {
    ...services,
    getUiStatsReporter: jest.fn(() => () => {}),
  };
});

const { setup } = pageHelpers.jobList;

describe('<JobList />', () => {
  describe('detail panel', () => {
    let component;
    let table;
    let exists;
    let startMock;

    beforeAll(() => {
      jest.useFakeTimers();
      startMock = coreMock.createStart();
      setHttp(startMock.http);
      initDocumentation(docLinksServiceMock.createStartContract());
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    beforeEach(async () => {
      mockHttpRequest(startMock.http, { jobs: JOBS });

      await act(async () => {
        ({ component, exists, table } = setup());
      });

      component.update();
    });

    afterEach(() => {
      startMock.http.get.mockClear();
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
        jobs: [
          {
            config: { id: jobId },
          },
        ],
      } = JOBS;
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
