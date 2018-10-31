/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import Boom from 'boom';

import {
  verifyApiAccessPre,
  getCallClusterPre,
  callEsSearchApi,
} from '../lib';

export const searchProxyRoute = {
  path: '/api/graph/searchProxy',
  method: 'POST',
  config: {
    pre: [
      getCallClusterPre,
      verifyApiAccessPre,
    ],
    validate: {
      payload: Joi.object().keys({
        index: Joi.string().required(),
        body: Joi.object().unknown(true).default()
      }).default()
    },
    handler(request) {
      return callEsSearchApi({
        callCluster: request.pre.callCluster,
        index: request.payload.index,
        body: request.payload.body
      });
    }
  }
};
