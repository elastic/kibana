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
  describe('table rows', () => {
    const totalJobs = 5;
    const jobs = getJobs(totalJobs);
    const openDetailPanel = jest.fn();
    const { findTestSubject } = initTestBed({ jobs, openDetailPanel });
    const tableRows = findTestSubject('jobTableRow');

    it('should create 1 table row per job', () => {
      expect(tableRows.length).toEqual(totalJobs);
    });

    it('should create the expected 8 columns for each row', () => {
      const expectedColumns = [
        'id',
        'status',
        'indexPattern',
        'rollupIndex',
        'rollupDelay',
        'dateHistogramInterval',
        'groups',
        'metrics'
      ];

      const tableColumns = expectedColumns
        .map(id => {
          const col = findTestSubject(`jobTableHeaderCell-${id}`);
          col.__id__ = id;
          return col;
        })
        .filter(col => !!col.length)
        .map(col => col.__id__);

      expect(tableColumns).toEqual(expectedColumns);
    });

    it('should set the correct job value in each row cell', () => {
      const fields = [
        'id',
        'indexPattern',
        'rollupIndex',
        'rollupDelay',
        'dateHistogramInterval',
      ];
      const row = tableRows.first();
      const job = jobs[0];
      const getCellText = (field) => row.find(`[data-test-subj="jobTableCell-${field}"]`).hostNodes().text();

      // Simple fields
      fields.forEach((field) => {
        const cellText = getCellText(field);
        expect(cellText).toEqual(job[field]);
      });

      // Status
      const cellStatusText = getCellText('status');
      expect(job.status).toEqual('stopped'); // make sure the job status *is* "stopped"
      expect(cellStatusText).toEqual('Stopped');

      // Groups
      const expectedJobGroups = ['histogram', 'terms'].reduce((text, field) => {
        if (job[field].length) {
          return text
            ? `${text}, ${field}`
            : field.replace(/^\w/, char => char.toUpperCase());
        }
        return text;
      }, '');
      const cellGroupsText = getCellText('groups');
      expect(cellGroupsText).toEqual(expectedJobGroups);

      // Metrics
      const expectedJobMetrics = job.metrics.reduce((text, { name }) => (
        text ? `${text}, ${name}` : name
      ), '');
      const cellMetricsText = getCellText('metrics');
      expect(cellMetricsText).toEqual(expectedJobMetrics);
    });

    it('should open the detail panel when clicking on the job id', () => {
      const row = tableRows.first();
      const job = jobs[0];
      const linkJobId = row.find(`[data-test-subj="jobTableCell-id"]`).hostNodes().find('EuiLink');

      linkJobId.simulate('click');

      expect(openDetailPanel.mock.calls[0][0]).toEqual(job.id);
    });
  });
});
