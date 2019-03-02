/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pager } from '@elastic/eui';

import { registerTestBed } from '../../../../../__jest__/utils';
import { getJobs } from '../../../../../fixtures';
import { rollupJobsStore } from '../../../store';
import { JobTable } from './job_table';

const defaultProps = {
  jobs: [],
  pager: new Pager(20, 10, 1),
  filter: '',
  sortField: '',
  isSortAscending: false,
  openDetailPanel: () => {},
  closeDetailPanel: () => {},
  filterChanged: () => {},
  pageChanged: () => {},
  pageSizeChanged: () => {},
  sortChanged: () => {},
};

const initTestBed = registerTestBed(JobTable, defaultProps, rollupJobsStore);

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

      const tableColumns = expectedColumns.reduce((tableColumns, columnId) => (
        findTestSubject(`jobTableHeaderCell-${columnId}`).length
          ? tableColumns.concat(columnId)
          : tableColumns
      ), []);

      expect(tableColumns).toEqual(expectedColumns);
    });

    it('should set the correct job value in each row cell', () => {
      const unformattedFields = [
        'id',
        'indexPattern',
        'rollupIndex',
        'rollupDelay',
        'dateHistogramInterval',
      ];
      const row = tableRows.first();
      const job = jobs[0];
      const getCellText = (field) => row.find(`[data-test-subj="jobTableCell-${field}"]`).hostNodes().text();

      unformattedFields.forEach((field) => {
        const cellText = getCellText(field);
        expect(cellText).toEqual(job[field]);
      });

      // Status
      const cellStatusText = getCellText('status');
      expect(job.status).toEqual('stopped'); // make sure the job status *is* "stopped"
      expect(cellStatusText).toEqual('Stopped');

      // Groups
      const cellGroupsText = getCellText('groups');
      expect(cellGroupsText).toEqual('Histogram, terms');

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

      expect(openDetailPanel.mock.calls.length).toBe(1);
      expect(openDetailPanel.mock.calls[0][0]).toBe(job.id);
    });
  });

  describe('action menu', () => {
    let findTestSubject;
    let testSubjectExists;
    let selectJob;
    let jobs;
    let tableRows;

    beforeEach(() => {
      jobs = getJobs();
      ({ findTestSubject, testSubjectExists } = initTestBed({ jobs }));
      tableRows = findTestSubject('jobTableRow');

      selectJob = (index = 0) => {
        const job = jobs[index];
        const row = tableRows.at(index);
        const checkBox = row.find(`[data-test-subj="indexTableRowCheckbox-${job.id}"]`).hostNodes();
        checkBox.simulate('change', { target: { checked: true } });
      };
    });

    it('should be visible when a job is selected', () => {
      expect(testSubjectExists('jobActionMenuButton')).toBeFalsy();

      selectJob();

      expect(testSubjectExists('jobActionMenuButton')).toBeTruthy();
    });

    it('should have a "start" and "delete" action for a job that is stopped', () => {
      const index = 0;
      const job = jobs[index];
      job.status = 'stopped';

      selectJob(index);
      const menuButton = findTestSubject('jobActionMenuButton');
      menuButton.simulate('click'); // open the context menu

      const contextMenu = findTestSubject('jobActionContextMenu');
      expect(contextMenu.length).toBeTruthy();

      const contextMenuButtons = contextMenu.find('button');
      const buttonsLabel = contextMenuButtons.map(btn => btn.text());
      expect(buttonsLabel).toEqual(['Start job', 'Delete job']);
    });

    it('should only have a "stop" action when the job is started', () => {
      const index = 0;
      const job = jobs[index];
      job.status = 'started';

      selectJob(index);
      findTestSubject('jobActionMenuButton').simulate('click');

      const contextMenuButtons = findTestSubject('jobActionContextMenu').find('button');
      const buttonsLabel = contextMenuButtons.map(btn => btn.text());
      expect(buttonsLabel).toEqual(['Stop job']);
    });

    it('should offer both "start" and "stop" actions when selecting job with different a status', () => {
      const job1 = jobs[0];
      const job2 = jobs[1];
      job1.status = 'started';
      job2.status = 'stopped';

      selectJob(0);
      selectJob(1);
      findTestSubject('jobActionMenuButton').simulate('click');

      const contextMenuButtons = findTestSubject('jobActionContextMenu').find('button');
      const buttonsLabel = contextMenuButtons.map(btn => btn.text());
      expect(buttonsLabel).toEqual(['Start jobs', 'Stop jobs']);
    });
  });
});
