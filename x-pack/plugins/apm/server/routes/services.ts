/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { IReply, Request, Server } from 'hapi';
import { withDefaultValidators } from '../lib/helpers/input_validation';
import { setupRequest } from '../lib/helpers/setup_request';
import { getService } from '../lib/services/get_service';
import { getServices } from '../lib/services/get_services';

const ROOT = '/api/apm/services';
const pre = [{ method: setupRequest, assign: 'setup' }];
const defaultErrorHandler = (reply: IReply) => (err: Error) => {
  // tslint:disable-next-line
  console.error(err.stack);
  // @ts-ignore
  reply(Boom.wrap(err, 400));
};

export function initServicesApi(server: Server) {
  server.route({
    method: 'GET',
    path: ROOT,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: (req: Request, reply: IReply) => {
      const { setup } = req.pre;
      return getServices(setup)
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });

  server.route({
    method: 'GET',
    path: `${ROOT}/{serviceName}`,
    config: {
      pre,
      validate: {
        query: withDefaultValidators()
      }
    },
    handler: (req: Request, reply: IReply) => {
      const { setup } = req.pre;
      const { serviceName } = req.params;
      return getService(serviceName, setup)
        .then(reply)
        .catch(defaultErrorHandler(reply));
    }
  });
}
