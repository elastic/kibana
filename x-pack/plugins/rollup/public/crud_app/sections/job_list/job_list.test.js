/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject as findTestSubjectHelper } from '@elastic/eui/lib/test';

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

const registerTestSubjExists = component => testSubject => findTestSubjectHelper(component, testSubject).length;

const initiateComponent = (props, store = rollupJobsStore) => {
  const component = mountWithIntl(
    <Provider store={store}>
      <JobList
        {...defaultProps}
        {...props}
      />
    </Provider>
  );
  const testSubjectExists = registerTestSubjExists(component);
  const findTestSubject = testSubject => findTestSubjectHelper(component, testSubject);

  return { component, testSubjectExists, findTestSubject };
};

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const { testSubjectExists } = initiateComponent();

    expect(testSubjectExists('jobListEmptyPrompt')).toBeTruthy();
  });

  describe('when there is an API error', () => {
    const { testSubjectExists, findTestSubject } = initiateComponent({
      jobLoadError: {
        status: 400,
        data: { statusCode: 400, error: 'Houston we got a problem.' }
      }
    });

    it('should display a callout with the status and the message', () => {
      expect(testSubjectExists('jobListError')).toBeTruthy();

      // Here we are testing implementation detail of eUI... thoughts?
      expect(findTestSubject('jobListError').find('EuiText').text()).toEqual('400 Houston we got a problem.');
    });
  });

  describe('when the user does not have the permission to access', () =>  {
    const { testSubjectExists } = initiateComponent({ jobLoadError: { status: 403 } });

    it('should render a callout message', () => {
      expect(testSubjectExists('jobListNoPermission')).toBeTruthy();
    });

    it('should display the page header', () => {
      expect(testSubjectExists('jobListPageHeader')).toBeTruthy();
    });
  });
});
