/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import Boom from 'boom';
import { ReportingCore } from '../';
import { API_BASE_URL } from '../../common/constants';
import { jobsQueryFactory } from '../lib/jobs_query';
import { authorizedUserPreRoutingFactory } from './lib/authorized_user_pre_routing';
import {
  deleteJobResponseHandlerFactory,
  downloadJobResponseHandlerFactory,
} from './lib/job_response_handler';

interface ListQuery {
  page: string;
  size: string;
  ids?: string; // optional field forbids us from extending RequestQuery
}
const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

const handleUnavailable = (res: any) => {
  return res.custom({ statusCode: 503, body: 'Not Available' });
};

export function registerJobInfoRoutes(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const userHandler = authorizedUserPreRoutingFactory(reporting);
  const { router } = setupDeps;

  // list jobs in the queue, paginated
  router.get(
    {
      path: `${MAIN_ENTRY}/list`,
      validate: false,
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();
      const {
        page: queryPage = '0',
        size: querySize = '10',
        ids: queryIds = null,
      } = req.query as ListQuery;
      const page = parseInt(queryPage, 10) || 0;
      const size = Math.min(100, parseInt(querySize, 10) || 10);
      const jobIds = queryIds ? queryIds.split(',') : null;
      const jobsQuery = jobsQueryFactory(reporting);
      const results = await jobsQuery.list(jobTypes, user, page, size, jobIds);

      return res.ok({
        body: results,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // return the count of all jobs in the queue
  router.get(
    {
      path: `${MAIN_ENTRY}/count`,
      validate: false,
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      const jobsQuery = jobsQueryFactory(reporting);
      const count = await jobsQuery.count(jobTypes, user);

      return res.ok({
        body: count.toString(),
        headers: {
          'content-type': 'text/plain',
        },
      });
    })
  );

  // return the raw output from a job
  router.get(
    {
      path: `${MAIN_ENTRY}/output/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { docId } = req.params as { docId: string };
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      const jobsQuery = jobsQueryFactory(reporting);
      const result = await jobsQuery.get(user, docId, { includeContent: true });

      if (!result) {
        throw Boom.notFound();
      }

      const {
        _source: { jobtype: jobType, output: jobOutput },
      } = result;

      if (!jobTypes.includes(jobType)) {
        throw Boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
      }

      return res.ok({
        body: jobOutput,
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // return some info about the job
  router.get(
    {
      path: `${MAIN_ENTRY}/info/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 2 }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return res.custom({ statusCode: 503 });
      }

      const { docId } = req.params as { docId: string };
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      const jobsQuery = jobsQueryFactory(reporting);
      const result = await jobsQuery.get(user, docId);

      if (!result) {
        throw Boom.notFound();
      }

      const { _source: job } = result;
      const { jobtype: jobType, payload: jobPayload } = job;

      if (!jobTypes.includes(jobType)) {
        throw Boom.unauthorized(`Sorry, you are not authorized to view ${jobType} info`);
      }

      return res.ok({
        body: {
          ...job,
          payload: {
            ...jobPayload,
            headers: undefined,
          },
        },
        headers: {
          'content-type': 'application/json',
        },
      });
    })
  );

  // trigger a download of the output from a job
  const downloadResponseHandler = downloadJobResponseHandlerFactory(reporting);

  router.get(
    {
      path: `${MAIN_ENTRY}/download/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { docId } = req.params as { docId: string };
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      return downloadResponseHandler(res, jobTypes, user, { docId });
    })
  );

  // allow a report to be deleted
  const deleteResponseHandler = deleteJobResponseHandlerFactory(reporting);
  router.delete(
    {
      path: `${MAIN_ENTRY}/delete/{docId}`,
      validate: {
        params: schema.object({
          docId: schema.string({ minLength: 3 }),
        }),
      },
    },
    userHandler(async (user, context, req, res) => {
      // ensure the async dependencies are loaded
      if (!context.reporting) {
        return handleUnavailable(res);
      }

      const { docId } = req.params as { docId: string };
      const {
        management: { jobTypes = [] },
      } = await reporting.getLicenseInfo();

      return deleteResponseHandler(res, jobTypes, user, { docId });
    })
  );
}
