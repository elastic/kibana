/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { registerTestBed } from '../../../../../../test_utils';
import { rollupJobsStore } from '../../store';
import { JobList } from './job_list';

import { KibanaContextProvider } from '../../../../../../../src/plugins/kibana_react/public';
import { coreMock } from '../../../../../../../src/core/public/mocks';
const startMock = coreMock.createStart();

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
  hasJobs: false,
  isLoading: false,
};

const services = {
  setBreadcrumbs: startMock.chrome.setBreadcrumbs,
};
const Component = (props) => (
  <KibanaContextProvider services={services}>
    <JobList {...props} />
  </KibanaContextProvider>
);

const initTestBed = registerTestBed(Component, { defaultProps, store: rollupJobsStore });

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const { exists } = initTestBed();

    expect(exists('jobListEmptyPrompt')).toBeTruthy();
  });

  it('should display a loading message when loading the jobs', () => {
    const { component, exists } = initTestBed({ isLoading: true });

    expect(exists('jobListLoading')).toBeTruthy();
    expect(component.find('JobTable').length).toBeFalsy();
  });

  it('should display the <JobTable /> when there are jobs', () => {
    const { component, exists } = initTestBed({ hasJobs: true });

    expect(exists('jobListLoading')).toBeFalsy();
    expect(component.find('JobTable').length).toBeTruthy();
  });

  describe('when there is an API error', () => {
    const { exists, find } = initTestBed({
      jobLoadError: {
        status: 400,
        body: { statusCode: 400, error: 'Houston we got a problem.' },
      },
    });

    it('should display a callout with the status and the message', () => {
      expect(exists('jobListError')).toBeTruthy();
      expect(find('jobListError').find('EuiText').text()).toEqual('400 Houston we got a problem.');
    });
  });

  describe('when the user does not have the permission to access it', () => {
    const { exists } = initTestBed({ jobLoadError: { status: 403 } });

    it('should render a callout message', () => {
      expect(exists('jobListNoPermission')).toBeTruthy();
    });

    it('should display the page header', () => {
      expect(exists('jobListPageHeader')).toBeTruthy();
    });
  });
});
