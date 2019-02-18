/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { findTestSubject } from '@elastic/eui/lib/test';

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

const registerTestSubjExists = component => testSubject => findTestSubject(component, testSubject).length;

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

  return { component, testSubjectExists };
};

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const { testSubjectExists } = initiateComponent();

    expect(testSubjectExists('jobListEmptyPrompt')).toBeTruthy();
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
