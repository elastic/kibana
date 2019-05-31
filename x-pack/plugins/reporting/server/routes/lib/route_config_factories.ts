/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Request } from 'hapi';
import Joi from 'joi';
import { KbnServer } from '../../../types';
// @ts-ignore
import { authorizedUserPreRoutingFactory } from './authorized_user_pre_routing';
// @ts-ignore
import { reportingFeaturePreRoutingFactory } from './reporting_feature_pre_routing';
import { CSV_FROM_SAVEDOBJECT_JOB_TYPE } from '../../../common/constants';

const API_TAG = 'api';

interface RouteConfigFactory {
  tags?: string[];
  pre: any[];
  response?: {
    ranges: boolean;
  };
}

type GetFeatureFunction = (request: Request) => any;
type PreRoutingFunction = (getFeatureId?: GetFeatureFunction) => any;

export function getRouteConfigFactoryReportingPre(server: KbnServer) {
  const authorizedUserPreRouting: PreRoutingFunction = authorizedUserPreRoutingFactory(server);
  const reportingFeaturePreRouting: PreRoutingFunction = reportingFeaturePreRoutingFactory(server);

  return (getFeatureId?: GetFeatureFunction): RouteConfigFactory => {
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

export function getRouteOptions(server: KbnServer) {
  const getRouteConfig = getRouteConfigFactoryReportingPre(server);
  return {
    ...getRouteConfig(() => CSV_FROM_SAVEDOBJECT_JOB_TYPE),
    validate: {
      params: Joi.object({
        savedObjectType: Joi.string().required(),
        savedObjectId: Joi.string().required(),
      }).required(),
      payload: Joi.object({
        state: Joi.object().default({}),
        timerange: Joi.object({
          timezone: Joi.string().default('UTC'),
          min: Joi.date().required(),
          max: Joi.date().required(),
        }).optional(),
      }),
    },
  };
}

export function getRouteConfigFactoryManagementPre(server: KbnServer) {
  const authorizedUserPreRouting = authorizedUserPreRoutingFactory(server);
  const reportingFeaturePreRouting = reportingFeaturePreRoutingFactory(server);
  const managementPreRouting = reportingFeaturePreRouting(() => 'management');

  return (): RouteConfigFactory => {
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
export function getRouteConfigFactoryDownloadPre(server: KbnServer) {
  const getManagementRouteConfig = getRouteConfigFactoryManagementPre(server);
  return (): RouteConfigFactory => ({
    ...getManagementRouteConfig(),
    tags: [API_TAG],
    response: {
      ranges: false,
    },
  });
}
