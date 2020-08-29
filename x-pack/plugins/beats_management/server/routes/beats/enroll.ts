/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ensureRawRequest } from '../../../../../../src/core/server/http/router';
import { REQUIRED_LICENSES } from '../../../common/constants/security';
import { BeatEnrollmentStatus } from '../../lib/types';
import { wrapRouteWithSecurity } from '../wrap_route_with_security';

export const registerBeatEnrollmentRoute = (router: IRouter) => {
  // TODO: write to Kibana audit log file https://github.com/elastic/kibana/issues/26024
  router.post(
    {
      path: '/api/beats/agent/{beatId}',
      validate: {
        params: schema.object({
          beatId: schema.string(),
        }),
        body: schema.object(
          {
            host_name: schema.string(),
            name: schema.string(),
            type: schema.string(),
            version: schema.string(),
          },
          { unknowns: 'ignore' }
        ),
      },
      options: {
        authRequired: false,
      },
    },
    wrapRouteWithSecurity(
      {
        requiredLicense: REQUIRED_LICENSES,
      },
      async (context, request, response) => {
        const beatsManagement = context.beatsManagement!;

        const { beatId } = request.params;
        const enrollmentToken = request.headers['kbn-beats-enrollment-token'] as string;
        if (!enrollmentToken) {
          return response.badRequest({
            body: 'beats enrollment token required',
          });
        }

        // TODO: fixme eventually, need to access `info.remoteAddress` from KibanaRequest.
        const legacyRequest = ensureRawRequest(request);

        const { status, accessToken } = await beatsManagement.beats.enrollBeat(
          enrollmentToken,
          beatId,
          legacyRequest.info.remoteAddress,
          request.body
        );

        switch (status) {
          case BeatEnrollmentStatus.ExpiredEnrollmentToken:
            return response.badRequest({
              body: {
                message: BeatEnrollmentStatus.ExpiredEnrollmentToken,
              },
            });
          case BeatEnrollmentStatus.InvalidEnrollmentToken:
            return response.badRequest({
              body: {
                message: BeatEnrollmentStatus.InvalidEnrollmentToken,
              },
            });
          case BeatEnrollmentStatus.Success:
          default:
            return response.ok({
              body: {
                item: accessToken,
                action: 'created',
                success: true,
              },
            });
        }
      }
    )
  );
};
