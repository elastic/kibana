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

describe('<JobList />', () => {
  it('should render empty prompt when loading is complete and there are no jobs', () => {
    const component = mountWithIntl(
      <Provider store={rollupJobsStore}>
        <JobList
          loadJobs={() => {}}
          refreshJobs={() => {}}
          openDetailPanel={() => {}}
          jobs={[]}
          isLoading={false}
          history={{ location: {} }}
        />
      </Provider>
    );

    const emptyPrompt = findTestSubject(component, 'jobListEmptyPrompt');
    expect(emptyPrompt).toBeTruthy();
  });
});
