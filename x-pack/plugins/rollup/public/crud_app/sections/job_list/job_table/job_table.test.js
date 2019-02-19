/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pager } from '@elastic/eui';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

import { getJobs } from '../../../../../fixtures';
import { registerTestBed } from '../../../../../common/lib';
import { rollupJobsStore } from '../../../store';
import { JobTable } from './job_table';

const defaultProps = {
  jobs: [],
  pager: new Pager(20, 10, 1),
  filter: '',
  sortField: '',
  isSortAscending: false,
  closeDetailPanel: () => {},
  filterChanged: () => {},
  pageChanged: () => {},
  pageSizeChanged: () => {},
  sortChanged: () => {},
};

const initTestBed = registerTestBed(JobTable, mountWithIntl, defaultProps, rollupJobsStore);

describe('<JobTable />', () => {
  it('should create 1 table row per job', () => {
    const totalJobs = 5;
    const jobs = getJobs(totalJobs);

    const { findTestSubject } = initTestBed({ jobs });
    const tableRows = findTestSubject('jobTableRow');

    expect(tableRows.length).toEqual(totalJobs);
  });
});
