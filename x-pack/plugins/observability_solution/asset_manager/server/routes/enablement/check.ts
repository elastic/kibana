/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
    readEntityDiscoveryAPIKey,
    checkIfEntityDiscoveryAPIKeyIsValid,
  } from '../../lib/auth';
  import { RequestHandlerContext } from '@kbn/core/server';
  import { SetupRouteOptions } from '../types';
  import { ENTITY_INTERNAL_API_PREFIX } from '../../../common/constants_entities';

export function checkEntityDiscoveryEnabledRoute<T extends RequestHandlerContext>({
    router,
    server,
  }: SetupRouteOptions<T>) {
    router.get(
      {
        path: `${ENTITY_INTERNAL_API_PREFIX}/enablement`,
        validate: false,
      },
      async (context, req, res) => {
        try {
          server.logger.debug("reading entity discovery API key from saved object");
          const apiKey = await readEntityDiscoveryAPIKey(server);
  
          if (apiKey === undefined) {
            return res.ok({
              body: {
                enabled: false,
                reason: "no saved entity discovery API key found",
              }
            });
          }
  
          server.logger.debug("validating existing entity discovery API key");
          const isValid = await checkIfEntityDiscoveryAPIKeyIsValid(server, apiKey);
  
          if (!isValid) {
            return res.ok({
              body: {
                enabled: false,
                reason: "entity discovery API key exists, but is not valid"
              }
            })
          }
  
          return res.ok({
            body: {
              enabled: true,
              reason: "valid entity discovery API key exists"
            }
          })
  
        } catch (e) {
          server.logger.error(e);
          throw e;
        }
      }
    )
  }