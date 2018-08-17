/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import {
  jobs,
  jobStats,
  datafeeds,
  datafeedStats,
} from './responses';

// mock callWithRequest
export const callWithRequest = (request) => {
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
  } else if (request === 'ml.jobs') {
    response = jobs;
  } else if (request === 'ml.jobStats') {
    response = jobStats;
  } else if (request === 'ml.datafeeds') {
    response = datafeeds;
  } else if (request === 'ml.datafeedStats') {
    response = datafeedStats;
  } else if (request === 'ml.calendars') {
    response = { calendars: [] };
  } else if (request === 'ml.events') {
    response = { events: [] };
  }

  return Promise.resolve(response);
};
