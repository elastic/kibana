/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon, { stub } from 'sinon';
import { NotificationsStart } from 'src/core/public';
import { JobSummary, ReportDocument } from '../../common/types';
import { ReportingAPIClient } from './reporting_api_client';
import { ReportingNotifierStreamHandler } from './stream_handler';

Object.defineProperty(window, 'sessionStorage', {
  value: {
    setItem: jest.fn(() => null),
  },
  writable: true,
});

const mockJobsFound = [
  {
    _id: 'job-source-mock1',
    _source: {
      status: 'completed',
      output: { max_size_reached: false, csv_contains_formulas: false },
      payload: { title: 'specimen' },
    },
  },
  {
    _id: 'job-source-mock2',
    _source: {
      status: 'failed',
      output: { max_size_reached: false, csv_contains_formulas: false },
      payload: { title: 'specimen' },
    },
  },
  {
    _id: 'job-source-mock3',
    _source: {
      status: 'pending',
      output: { max_size_reached: false, csv_contains_formulas: false },
      payload: { title: 'specimen' },
    },
  },
];

const jobQueueClientMock: ReportingAPIClient = {
  findForJobIds: async (jobIds: string[]) => {
    return mockJobsFound as ReportDocument[];
  },
  getContent: (): Promise<any> => {
    return Promise.resolve({ content: 'this is the completed report data' });
  },
  getManagementLink: () => '/#management',
  getDownloadLink: () => '/reporting/download/job-123',
} as any;

const mockShowDanger = stub();
const mockShowSuccess = stub();
const mockShowWarning = stub();
const notificationsMock = ({
  toasts: {
    addDanger: mockShowDanger,
    addSuccess: mockShowSuccess,
    addWarning: mockShowWarning,
  },
} as unknown) as NotificationsStart;

describe('stream handler', () => {
  afterEach(() => {
    sinon.reset();
  });

  it('constructs', () => {
    const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
    expect(sh).not.toBe(null);
  });

  describe('findChangedStatusJobs', () => {
    it('finds no changed status jobs from empty', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
      const findJobs = sh.findChangedStatusJobs([]);
      findJobs.subscribe((data) => {
        expect(data).toEqual({ completed: [], failed: [] });
        done();
      });
    });

    it('finds changed status jobs', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
      const findJobs = sh.findChangedStatusJobs([
        'job-source-mock1',
        'job-source-mock2',
        'job-source-mock3',
      ]);

      findJobs.subscribe((data) => {
        expect(data).toMatchSnapshot();
        done();
      });
    });
  });

  describe('showNotifications', () => {
    it('show success', (done) => {
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
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
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
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
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
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
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
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
      const sh = new ReportingNotifierStreamHandler(notificationsMock, jobQueueClientMock);
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
