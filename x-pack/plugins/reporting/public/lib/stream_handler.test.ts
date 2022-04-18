/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { stub } from 'sinon';
import { NotificationsStart } from '@kbn/core/public';
import { coreMock, themeServiceMock } from '@kbn/core/public/mocks';
import { JobSummary, ReportApiJSON } from '../../common/types';
import { Job } from './job';
import { ReportingAPIClient } from './reporting_api_client';
import { ReportingNotifierStreamHandler } from './stream_handler';

Object.defineProperty(window, 'sessionStorage', {
  value: {
    setItem: jest.fn(() => null),
  },
  writable: true,
});

const mockJobsFound: Job[] = [
  { id: 'job-source-mock1', status: 'completed', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock2', status: 'failed', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock3', status: 'pending', output: { csv_contains_formulas: false, max_size_reached: false }, payload: { title: 'specimen' } },
  { id: 'job-source-mock4', status: 'completed', output: { csv_contains_formulas: true, max_size_reached: false }, payload: { title: 'specimen' } },
].map((j) => new Job(j as ReportApiJSON)); // prettier-ignore

const coreSetup = coreMock.createSetup();
const jobQueueClientMock = new ReportingAPIClient(coreSetup.http, coreSetup.uiSettings, '7.15.0');
jobQueueClientMock.findForJobIds = async () => mockJobsFound;
jobQueueClientMock.getInfo = () =>
  Promise.resolve({ content: 'this is the completed report data' } as unknown as Job);
jobQueueClientMock.getError = () => Promise.resolve('this is the failed report error');
jobQueueClientMock.getManagementLink = () => '/#management';
jobQueueClientMock.getDownloadLink = () => '/reporting/download/job-123';

const mockShowDanger = stub();
const mockShowSuccess = stub();
const mockShowWarning = stub();
const notificationsMock = {
  toasts: {
    addDanger: mockShowDanger,
    addSuccess: mockShowSuccess,
    addWarning: mockShowWarning,
  },
} as unknown as NotificationsStart;

const theme = themeServiceMock.createStartContract();

describe('stream handler', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('constructs', () => {
    const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
    expect(sh).not.toBe(null);
  });

  describe('findChangedStatusJobs', () => {
    it('finds no changed status jobs from empty', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      const findJobs = sh.findChangedStatusJobs([]);
      findJobs.subscribe((data) => {
        expect(data).toEqual({ completed: [], failed: [] });
        done();
      });
    });

    it('finds changed status jobs', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      const findJobs = sh.findChangedStatusJobs([
        'job-source-mock1',
        'job-source-mock2',
        'job-source-mock3',
        'job-source-mock4',
      ]);

      findJobs.subscribe((data) => {
        expect(data).toMatchSnapshot();
        done();
      });
    });
  });

  describe('showNotifications', () => {
    it('show success', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      sh.showNotifications({
        completed: [
          {
            id: 'yas1',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger.callCount).toBe(0);
        expect(mockShowSuccess.callCount).toBe(1);
        expect(mockShowWarning.callCount).toBe(0);
        expect(mockShowSuccess.args[0]).toMatchSnapshot();
        done();
      });
    });

    it('show max length warning', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      sh.showNotifications({
        completed: [
          {
            id: 'yas2',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
            maxSizeReached: true,
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger.callCount).toBe(0);
        expect(mockShowSuccess.callCount).toBe(0);
        expect(mockShowWarning.callCount).toBe(1);
        expect(mockShowWarning.args[0]).toMatchSnapshot();
        done();
      });
    });

    it('show csv formulas warning', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      sh.showNotifications({
        completed: [
          {
            id: 'yas3',
            title: 'Yas',
            jobtype: 'yas',
            status: 'completed',
            csvContainsFormulas: true,
          } as JobSummary,
        ],
        failed: [],
      }).subscribe(() => {
        expect(mockShowDanger.callCount).toBe(0);
        expect(mockShowSuccess.callCount).toBe(0);
        expect(mockShowWarning.callCount).toBe(1);
        expect(mockShowWarning.args[0]).toMatchSnapshot();
        done();
      });
    });

    it('show failed job toast', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      sh.showNotifications({
        completed: [],
        failed: [
          {
            id: 'yas7',
            title: 'Yas 7',
            jobtype: 'yas',
            status: 'failed',
          } as JobSummary,
        ],
      }).subscribe(() => {
        expect(mockShowSuccess.callCount).toBe(0);
        expect(mockShowWarning.callCount).toBe(0);
        expect(mockShowDanger.callCount).toBe(1);
        expect(mockShowDanger.args[0]).toMatchSnapshot();
        done();
      });
    });

    it('show multiple toast', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock, theme);
      sh.showNotifications({
        completed: [
          {
            id: 'yas8',
            title: 'Yas 8',
            jobtype: 'yas',
            status: 'completed',
          } as JobSummary,
          {
            id: 'yas9',
            title: 'Yas 9',
            jobtype: 'yas',
            status: 'completed',
            csvContainsFormulas: true,
          } as JobSummary,
          {
            id: 'yas10',
            title: 'Yas 10',
            jobtype: 'yas',
            status: 'completed',
            maxSizeReached: true,
          } as JobSummary,
        ],
        failed: [
          {
            id: 'yas13',
            title: 'Yas 13',
            jobtype: 'yas',
            status: 'failed',
          } as JobSummary,
        ],
      }).subscribe(() => {
        expect(mockShowSuccess.callCount).toBe(1);
        expect(mockShowWarning.callCount).toBe(2);
        expect(mockShowDanger.callCount).toBe(1);
        done();
      });
    });
  });
});
