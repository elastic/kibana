/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { wrapCustomError } from '../error_wrappers';
import { LICENSE_STATUS_VALID } from '../../../../common/constants';

export const licensePreRoutingFactory = (server, pluginId) => {
  return () => {
    // License checking and enable/disable logic
    const xpackMainPlugin = server.plugins.xpack_main;
    const licenseCheckResults = xpackMainPlugin.info.feature(pluginId).getLicenseCheckResults();
    if (licenseCheckResults.status !== LICENSE_STATUS_VALID) {
      const error = new Error(licenseCheckResults.message);
      const statusCode = 403;
      throw wrapCustomError(error, statusCode);
    }

    return null;
  };
};
