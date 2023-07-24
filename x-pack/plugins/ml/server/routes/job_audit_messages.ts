/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '../../common/constants/app';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../types';
import { jobAuditMessagesProvider } from '../models/job_audit_messages';
import {
  jobAuditMessagesQuerySchema,
  jobAuditMessagesJobIdSchema,
  clearJobAuditMessagesBodySchema,
} from './schemas/job_audit_messages_schema';

/**
 * Routes for job audit message routes
 */
export function jobAuditMessagesRoutes({ router, routeGuard }: RouteInitialization) {
  /**
   * @apiGroup JobAuditMessages
   *
   * @api {get} /internal/ml/job_audit_messages/messages/:jobId Get audit messages
   * @apiName GetJobAuditMessages
   * @apiDescription Returns audit messages for specified job ID
   *
   * @apiSchema (params) jobAuditMessagesJobIdSchema
   * @apiSchema (query) jobAuditMessagesQuerySchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/job_audit_messages/messages/{jobId}`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: jobAuditMessagesJobIdSchema,
            query: jobAuditMessagesQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { getJobAuditMessages } = jobAuditMessagesProvider(client, mlClient);
            const { jobId } = request.params;
            const { from, start, end } = request.query;
            const resp = await getJobAuditMessages(mlSavedObjectService, {
              jobId,
              from,
              start,
              end,
            });

            return response.ok({
              body: resp,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup JobAuditMessages
   *
   * @api {get} /internal/ml/job_audit_messages/messages Get all audit messages
   * @apiName GetAllJobAuditMessages
   * @apiDescription Returns all audit messages
   *
   * @apiSchema (query) jobAuditMessagesQuerySchema
   */
  router.versioned
    .get({
      path: `${ML_INTERNAL_BASE_PATH}/job_audit_messages/messages`,
      access: 'internal',
      options: {
        tags: ['access:ml:canGetJobs'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: jobAuditMessagesQuerySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { getJobAuditMessages } = jobAuditMessagesProvider(client, mlClient);
            const { from } = request.query;
            const resp = await getJobAuditMessages(mlSavedObjectService, { from });

            return response.ok({
              body: resp,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );

  /**
   * @apiGroup JobAuditMessages
   *
   * @api {put} /internal/ml/job_audit_messages/clear_messages Clear messages
   * @apiName ClearJobAuditMessages
   * @apiDescription Clear the job audit messages.
   *
   * @apiSchema (body) clearJobAuditMessagesSchema
   */
  router.versioned
    .put({
      path: `${ML_INTERNAL_BASE_PATH}/job_audit_messages/clear_messages`,
      access: 'internal',
      options: {
        tags: ['access:ml:canCreateJob'],
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            body: clearJobAuditMessagesBodySchema,
          },
        },
      },
      routeGuard.fullLicenseAPIGuard(
        async ({ client, mlClient, request, response, mlSavedObjectService }) => {
          try {
            const { clearJobAuditMessages } = jobAuditMessagesProvider(client, mlClient);
            const { jobId, notificationIndices } = request.body;
            const resp = await clearJobAuditMessages(jobId, notificationIndices);

            return response.ok({
              body: resp,
            });
          } catch (e) {
            return response.customError(wrapError(e));
          }
        }
      )
    );
}
