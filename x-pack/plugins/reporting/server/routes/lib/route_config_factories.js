/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';
import { reportingFeaturePreRoutingFactory } from './reporting_feature_pre_routing';

const API_TAG = 'api';

export function getRouteConfigFactoryReportingPre(server) {
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server);

  return getFeatureId => {
    const preRouting = [{ method: authorizedUserPreRouting, assign: 'user' }];
    if (getFeatureId) {
      preRouting.push(reportingFeaturePreRouting(getFeatureId));
    }

    return {
      tags: [API_TAG],
      pre: preRouting,
    };
  };
}

export function getRouteConfigFactoryManagementPre(server) {
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server);
  const managementPreRouting = reportingFeaturePreRouting(() => 'management');

  return () => {
    return {
      pre: [
        { method: authorizedUserPreRouting, assign: 'user' },
        { method: managementPreRouting, assign: 'management' },
      ],
    };
  };
}

// NOTE: We're disabling range request for downloading the PDF. There's a bug in Firefox's PDF.js viewer
// (https://github.com/mozilla/pdf.js/issues/8958) where they're using a range request to retrieve the
// TOC at the end of the PDF, but it's sending multiple cookies and causing our auth to fail with a 401.
// Additionally, the range-request doesn't alleviate any performance issues on the server as the entire
// download is loaded into memory.
export function getRouteConfigFactoryDownloadPre(server) {
  const getManagementRouteConfig = getRouteConfigFactoryManagementPre(server);
  return () => ({
    ...getManagementRouteConfig(),
    tags: [API_TAG],
    response: {
      ranges: false,
    },
  });
}
