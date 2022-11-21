/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ROUTE_TAG_CAN_REDIRECT } from '@kbn/security-plugin/server';
import { promisify } from 'util';
import { ReportingCore } from '../..';
import { ALLOWED_JOB_CONTENT_TYPES, API_BASE_URL } from '../../../common/constants';
import { getContentStream } from '../../lib';
import {
  authorizedUserPreRouting,
  getCounters,
  handleUnavailable,
  jobManagementPreRouting,
  jobsQueryFactory,
} from '../lib';

const MAIN_ENTRY = `${API_BASE_URL}/jobs`;

export function registerJobInfoRoutes(reporting: ReportingCore) {
  const setupDeps = reporting.getPluginSetupDeps();
  const { router } = setupDeps;
  const jobsQuery = jobsQueryFactory(reporting);

  const registerGetList = () => {
    // list jobs in the queue, paginated
    const path = `${MAIN_ENTRY}/list`;

    router.get(
      {
        path,
        validate: {
          query: schema.object({
            page: schema.string({ defaultValue: '0' }),
            size: schema.string({ defaultValue: '10' }),
            ids: schema.maybe(schema.string()),
          }),
        },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const {
          management: { jobTypes = [] },
        } = await reporting.getLicenseInfo();
        const { page: queryPage = '0', size: querySize = '10', ids: queryIds = null } = req.query;
        const page = parseInt(queryPage, 10) || 0;
        const size = Math.min(100, parseInt(querySize, 10) || 10);
        const jobIds = queryIds ? queryIds.split(',') : null;
        const results = await jobsQuery.list(jobTypes, user, page, size, jobIds);

        counters.usageCounter();

        return res.ok({
          body: results,
          headers: {
            'content-type': 'application/json',
          },
        });
      })
    );
  };

  const registerGetCount = () => {
    // return the count of all jobs in the queue
    const path = `${MAIN_ENTRY}/count`;

    router.get(
      {
        path,
        validate: false,
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const {
          management: { jobTypes = [] },
        } = await reporting.getLicenseInfo();

        const count = await jobsQuery.count(jobTypes, user);

        counters.usageCounter();

        return res.ok({
          body: count.toString(),
          headers: {
            'content-type': 'text/plain',
          },
        });
      })
    );
  };

  const registerGetInfo = () => {
    // return some info about the job
    const path = `${MAIN_ENTRY}/info/{docId}`;

    router.get(
      {
        path,
        validate: {
          params: schema.object({
            docId: schema.string({ minLength: 2 }),
          }),
        },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return res.custom({ statusCode: 503 });
        }

        const { docId } = req.params;
        return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) =>
          res.ok({
            body: doc,
            headers: {
              'content-type': 'application/json',
            },
          })
        );
      })
    );
  };

  const registerDownloadReport = () => {
    // trigger a download of the output from a job
    const path = `${MAIN_ENTRY}/download/{docId}`;

    router.get(
      {
        path,
        validate: {
          params: schema.object({
            docId: schema.string({ minLength: 3 }),
          }),
        },
        options: { tags: [ROUTE_TAG_CAN_REDIRECT] },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const { docId } = req.params;

        return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) => {
          const payload = await jobsQuery.getDocumentPayload(doc);

          if (!payload.contentType || !ALLOWED_JOB_CONTENT_TYPES.includes(payload.contentType)) {
            return res.badRequest({
              body: `Unsupported content-type of ${payload.contentType} specified by job output`,
            });
          }

          return res.custom({
            body:
              typeof payload.content === 'string' ? Buffer.from(payload.content) : payload.content,
            statusCode: payload.statusCode,
            headers: {
              ...payload.headers,
              'content-type': payload.contentType,
            },
          });
        });
      })
    );
  };

  const registerDeleteReport = () => {
    // allow a report to be deleted
    const path = `${MAIN_ENTRY}/delete/{docId}`;

    router.delete(
      {
        path,
        validate: {
          params: schema.object({
            docId: schema.string({ minLength: 3 }),
          }),
        },
      },
      authorizedUserPreRouting(reporting, async (user, context, req, res) => {
        const counters = getCounters(req.route.method, path, reporting.getUsageCounter());

        // ensure the async dependencies are loaded
        if (!context.reporting) {
          return handleUnavailable(res);
        }

        const { docId } = req.params;

        return jobManagementPreRouting(reporting, res, docId, user, counters, async (doc) => {
          const docIndex = doc.index;
          const stream = await getContentStream(reporting, { id: docId, index: docIndex });

          /** @note Overwriting existing content with an empty buffer to remove all the chunks. */
          await promisify(stream.end.bind(stream, '', 'utf8'))();
          await jobsQuery.delete(docIndex, docId);

          return res.ok({
            body: { deleted: true },
          });
        });
      })
    );
  };

  registerGetList();
  registerGetCount();
  registerGetInfo();
  registerDownloadReport();
  registerDeleteReport();
}
