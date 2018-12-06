/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { API_BASE_URL } from '../../common/constants';
import { jobsQueryFactory } from '../lib/jobs_query';
import { reportingFeaturePreRoutingFactory } from'../lib/reporting_feature_pre_routing';
import { authorizedUserPreRoutingFactory } from '../lib/authorized_user_pre_routing';
import { jobResponseHandlerFactory } from '../lib/job_response_handler';

const mainEntry = `${API_BASE_URL}/jobs`;
const API_TAG = 'api';

export function jobs(server) {
  const jobsQuery = jobsQueryFactory(server);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server);
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server);
  const jobResponseHandler = jobResponseHandlerFactory(server);

  const managementPreRouting = reportingFeaturePreRouting(() => 'management');

  function getRouteConfig() {
    return {
      pre: [
        { method: authorizedUserPreRouting, assign: 'user' },
        { method: managementPreRouting, assign: 'management' },
      ],
    };
  }

  // list jobs in the queue, paginated
  server.route({
    path: `${mainEntry}/list`,
    method: 'GET',
    handler: (request) => {
      const page = parseInt(request.query.page) || 0;
      const size = Math.min(100, parseInt(request.query.size) || 10);
      const jobIds = request.query.ids ? request.query.ids.split(',') : null;

      const results = jobsQuery.list(request.pre.management.jobTypes, request.pre.user, page, size, jobIds);
      return results;
    },
    config: getRouteConfig(),
  });

  // return the count of all jobs in the queue
  server.route({
    path: `${mainEntry}/count`,
    method: 'GET',
    handler: (request) => {
      const results = jobsQuery.count(request.pre.management.jobTypes, request.pre.user);
      return results;
    },
    config: getRouteConfig(),
  });

  // return the raw output from a job
  server.route({
    path: `${mainEntry}/output/{docId}`,
    method: 'GET',
    handler: (request) => {
      const { docId } = request.params;

      return jobsQuery.get(request.pre.user, docId, { includeContent: true })
        .then((doc) => {
          if (!doc) {
            return boom.notFound();
          }

          const { jobtype: jobType } = doc._source;
          if (!request.pre.management.jobTypes.includes(jobType)) {
            return boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
          }

          return doc._source.output;
        });
    },
    config: getRouteConfig(),
  });

  // return some info about the job
  server.route({
    path: `${mainEntry}/info/{docId}`,
    method: 'GET',
    handler: (request) => {
      const { docId } = request.params;

      return jobsQuery.get(request.pre.user, docId)
        .then((doc) => {
          if (!doc) {
            return boom.notFound();
          }

          const { jobtype: jobType } = doc._source;
          if (!request.pre.management.jobTypes.includes(jobType)) {
            return boom.unauthorized(`Sorry, you are not authorized to view ${jobType} info`);
          }

          const { payload } = doc._source;
          payload.headers = 'not shown';

          return {
            ...doc._source,
            payload
          };
        });
    },
    config: getRouteConfig(),
  });

  // trigger a download of the output from a job
  // NOTE: We're disabling range request for downloading the PDF. There's a bug in Firefox's PDF.js viewer
  // (https://github.com/mozilla/pdf.js/issues/8958) where they're using a range request to retrieve the
  // TOC at the end of the PDF, but it's sending multiple cookies and causing our auth to fail with a 401.
  // Additionally, the range-request doesn't alleviate any performance issues on the server as the entire
  // download is loaded into memory.
  server.route({
    path: `${mainEntry}/download/{docId}`,
    method: 'GET',
    handler: async (request, h) => {
      const { docId } = request.params;

      let response = await jobResponseHandler(request.pre.management.jobTypes, request.pre.user, h, { docId });
      if (!response.isBoom) {
        response = response.header('accept-ranges', 'none');
      }

      return response;
    },
    config: {
      ...getRouteConfig(),
      tags: [API_TAG],
      response: {
        ranges: false
      }
    },
  });
}
