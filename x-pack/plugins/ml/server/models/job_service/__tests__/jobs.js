/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import expect from 'expect.js';
import { jobsProvider } from '../jobs.js';

// mock callWithRequest
const callWithRequest = (request) => {
  let response = {};
  if (request === 'ml.datafeeds') {
    response = {
      datafeeds: [
        {
          datafeed_id: 'datafeed-test',
          job_id: 'test'
        },
        {
          datafeed_id: 'datafeed-test-two',
          job_id: 'test-two'
        }
      ]
    };
  } else if (request === 'ml.deleteJob') {
    response = {
      acknowledged: true
    };
  } else if (request === 'ml.deleteDatafeed') {
    response = {
      acknowledged: true
    };
  } else if (request === 'ml.closeJob') {
    response = {
      acknowledged: true
    };
  }

  return Promise.resolve(response);
};

describe('ML - Jobs service', () => {
  it('call factory', () => {
    expect(function () {
      jobsProvider(callWithRequest);
    }).to.not.throwError('Not initialized.');
  });

  it('delete job success', (done) => {
    const jobId = 'test';
    const { deleteJobs } = jobsProvider(callWithRequest);
    deleteJobs([jobId])
      .then((resp) => {
        if (resp[jobId]) {
          expect(resp[jobId].deleted).to.be(true);
          done();
        }
      });
  });

  it('delete job no datafeed success', (done) => {
    const jobId = 'test-no-datafeed';
    const { deleteJobs } = jobsProvider(callWithRequest);
    deleteJobs([jobId])
      .then((resp) => {
        if (resp[jobId]) {
          expect(resp[jobId].deleted).to.be(true);
          done();
        }
      });
  });

  it('delete multiple jobs success', (done) => {
    const jobIds = ['test', 'test-two'];
    const { deleteJobs } = jobsProvider(callWithRequest);
    deleteJobs(jobIds)
      .then((resp) => {
        if (resp[jobIds[0]] && resp[jobIds[0]]) {
          expect(resp[jobIds[0]].deleted).to.be(true);
          expect(resp[jobIds[1]].deleted).to.be(true);
          done();
        }
      });
  });

  it('close job success', (done) => {
    const jobId = 'test';
    const { closeJobs } = jobsProvider(callWithRequest);
    closeJobs([jobId])
      .then((resp) => {
        if (resp[jobId]) {
          expect(resp[jobId].closed).to.be(true);
          done();
        }
      });
  });

  it('close multiple jobs success', (done) => {
    const jobIds = ['test', 'test-two'];
    const { closeJobs } = jobsProvider(callWithRequest);
    closeJobs(jobIds)
      .then((resp) => {
        if (resp[jobIds[0]] && resp[jobIds[0]]) {
          expect(resp[jobIds[0]].closed).to.be(true);
          expect(resp[jobIds[1]].closed).to.be(true);
          done();
        }
      });
  });

});
