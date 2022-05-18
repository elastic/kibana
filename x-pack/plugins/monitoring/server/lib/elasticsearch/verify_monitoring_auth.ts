/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import Boom from '@hapi/boom';
import { INDEX_PATTERN } from '../../../common/constants';
import { LegacyRequest } from '../../types';

/*
 * Check the currently logged-in user's privileges for "read" privileges on the
 * monitoring data. Throws Boom.forbidden if the user fails the check, which
 * allows handleError to format the error properly for the UI.
 *
 * @param req {Object} the server route handler request object
 */

// TODO: replace LegacyRequest with current request object + plugin retrieval
export async function verifyMonitoringAuth(req: LegacyRequest) {
  const xpackInfo = get(req.server.plugins.monitoring, 'info');

  if (xpackInfo) {
    const licenseService = await xpackInfo.getLicenseService();
    const security = licenseService.getSecurityFeature();

    // we only need to verify permissions if we're using X-Pack Security
    if (security.isAvailable && security.isEnabled) {
      await verifyHasPrivileges(req);
    }
  }
}

/**
 * Reach out to the Monitoring cluster and ensure that it believes the current user has the privileges necessary
 * to make API calls against .monitoring-* indices.
 *
 * @param req {Object} the server route handler request object
 * @return {Promise} That either resolves with no response (void) or an exception.
 */

// TODO: replace LegacyRequest with current request object + plugin retrieval
async function verifyHasPrivileges(req: LegacyRequest) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');

  let response;
  try {
    response = await callWithRequest(req, 'transport.request', {
      method: 'POST',
      path: '/_security/user/_has_privileges',
      body: {
        index: [
          {
            names: [INDEX_PATTERN], // uses wildcard
            privileges: ['read'],
          },
        ],
      },
      ignore_unavailable: true, // we allow 404 incase the user shutdown security in-between the check and now
    });
  } catch (err) {
    if (
      err.message === 'no handler found for uri [/_security/user/_has_privileges] and method [POST]'
    ) {
      return;
    }
    throw err;
  }

  // we assume true because, if the response 404ed, then it will not exist but we should try to continue
  const hasAllRequestedPrivileges = get(response, 'has_all_requested', true);

  if (!hasAllRequestedPrivileges) {
    throw Boom.forbidden();
  }
}
