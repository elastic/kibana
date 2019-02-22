/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerTestBed } from '../../../../__jest__/utils';
import { rollupJobsStore } from '../../store';
import { JobList } from './job_list';

jest.mock('ui/chrome', () => ({
  addBasePath: () => {},
  breadcrumbs: { set: () => {} },
}));

jest.mock('../../services', () => {
  const services = require.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

const defaultProps = {
  history: { location: {} },
  loadJobs: () => {},
  refreshJobs: () => {},
  openDetailPanel: () => {},
  jobs: [],
  isLoading: false
};

const initTestBed = registerTestBed(JobList, defaultProps, rollupJobsStore);

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const { testSubjectExists } = initTestBed();

    expect(testSubjectExists('jobListEmptyPrompt')).toBeTruthy();
  });

  it('should display a loading message when loading the jobs', () => {
    const { testSubjectExists } = initTestBed({ isLoading: true });

    expect(testSubjectExists('jobListLoading')).toBeTruthy();
    expect(testSubjectExists('jobListTable')).toBeFalsy();
  });

  it('should display the <JobTable /> when there are jobs', () => {
    const { component, testSubjectExists } = initTestBed({ jobs: [{ foo: 'bar' }] });

    expect(testSubjectExists('jobListLoading')).toBeFalsy();
    expect(component.find('JobTableUi').length).toBeTruthy();
  });

  describe('route query params change', () => {
    it('should call the "openDetailPanel()" prop each time the "job" query params changes', () => {
      const openDetailPanel = jest.fn();
      const jobId = 'foo';
      const { setProps } = initTestBed({ openDetailPanel });

      expect(openDetailPanel.mock.calls.length).toBe(0);

      setProps({
        history: { location: { search: `?job=${jobId}` } },
        openDetailPanel,
      });

      expect(openDetailPanel.mock.calls.length).toBe(1);
      expect(openDetailPanel.mock.calls[0][0]).toEqual(jobId);
    });
  });

  describe('when there is an API error', () => {
    const { testSubjectExists, findTestSubject } = initTestBed({
      jobLoadError: {
        status: 400,
        data: { statusCode: 400, error: 'Houston we got a problem.' }
      }
    });

    it('should display a callout with the status and the message', () => {
      expect(testSubjectExists('jobListError')).toBeTruthy();
      expect(findTestSubject('jobListError').find('EuiText').text()).toEqual('400 Houston we got a problem.');
    });
  });

  describe('when the user does not have the permission to access it', () =>  {
    const { testSubjectExists } = initTestBed({ jobLoadError: { status: 403 } });

    it('should render a callout message', () => {
      expect(testSubjectExists('jobListNoPermission')).toBeTruthy();
    });

    it('should display the page header', () => {
      expect(testSubjectExists('jobListPageHeader')).toBeTruthy();
    });
  });
});
