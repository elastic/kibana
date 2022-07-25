/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { rollupJobsStore } from '../../store';
import { JobList } from './job_list';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
const startMock = coreMock.createStart();

jest.mock('../../services', () => {
  const services = jest.requireActual('../../services');
  return {
    ...services,
    getRouterLinkProps: (link) => ({ href: link }),
  };
});

jest.mock('../../services/documentation_links', () => {
  const coreMocks = jest.requireActual('@kbn/core/public/mocks');

  return {
    init: jest.fn(),
    documentationLinks: coreMocks.docLinksServiceMock.createStartContract().links,
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

    expect(exists('sectionLoading')).toBeTruthy();
    expect(component.find('JobTable').length).toBeFalsy();
  });

  it('should display the <JobTable /> when there are jobs', () => {
    const { component, exists } = initTestBed({ hasJobs: true });

    expect(exists('sectionLoading')).toBeFalsy();
    expect(component.find('JobTable').length).toBeTruthy();
  });

  describe('when there is an API error', () => {
    const { exists, find } = initTestBed({
      jobLoadError: {
        status: 400,
        body: { statusCode: 400, error: 'Houston we got a problem.' },
      },
    });

    it('should display an error with the status and the message', () => {
      expect(exists('jobListError')).toBeTruthy();
      expect(find('jobListError').find('EuiText').text()).toEqual('400 Houston we got a problem.');
    });
  });

  describe('when the user does not have the permission to access it', () => {
    const { exists, find } = initTestBed({ jobLoadError: { status: 403 } });

    it('should render an error message', () => {
      expect(exists('jobListNoPermission')).toBeTruthy();
      expect(find('jobListNoPermission').find('EuiText').text()).toEqual(
        'You do not have permission to view or add rollup jobs.'
      );
    });
  });
});
