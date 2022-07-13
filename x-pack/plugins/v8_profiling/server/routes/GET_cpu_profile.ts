/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// run a profile via
//    curl -kOJ $KBN_URL/_dev/cpu_profile?duration=seconds
// if no duration parameter is used, the default is 5 seconds

import { schema } from '@kbn/config-schema';
import { IRouter } from '@kbn/core/server';
import { Plugin } from '..';
import { createSession, Session } from '../lib/session';
import { startProfiling } from '../lib/profile';
import { createDeferred } from '../lib/deferred';

const routeValidation = {
  query: schema.object({
    duration: schema.number({ defaultValue: 5 }),
  }),
};

const routeConfig = {
  path: '/_dev/cpu_profile',
  validate: routeValidation,
};

export function registerRoute(plugin: Plugin, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    let session: Session;
    try {
      session = await createSession(plugin);
    } catch (err) {
      return response.badRequest({ body: `unable to create session: ${err.message}` });
    }

    plugin.logger.info(`starting cpuProfile`);
    const deferred = createDeferred();
    let stopProfiling: any;
    try {
      stopProfiling = await startProfiling(session);
    } catch (err) {
      return response.badRequest({ body: `unable to start profiling: ${err.message}` });
    }

    setTimeout(whenDone, 1000 * request.query.duration);

    let profile;
    async function whenDone() {
      plugin.logger.info(`stopping cpuProfile`);
      try {
        profile = await stopProfiling();
      } catch (err) {
        plugin.logger.warn(`unable to capture profile: ${err.message}`);
      }
      deferred.resolve();
    }

    await deferred.promise;

    try {
      await session.destroy();
    } catch (err) {
      plugin.logger.warn(`unable to destroy session: ${err.message}`);
    }

    if (profile == null) {
      return response.badRequest({ body: `unable to capture profile` });
    }

    const fileName = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/\//g, '-')
      .replace(/:/g, '-')
      .substring(5, 19);

    return response.ok({
      body: profile,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}.cpuprofile"`,
      },
    });
  });
}
