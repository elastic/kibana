// run a profile via
//    curl -kOJ $KBN_URL/_dev/heap_snapshot

import { IRouter } from '@kbn/core/server';
import { Plugin } from '..';
import { createSession, Session } from '../lib/session';
import { takeHeapSnapshot } from '../lib/heap_snapshot';

const routeConfig = {
  path: '/_dev/heap_snapshot',
  validate: {},
};

export function registerRoute(plugin: Plugin, router: IRouter): void {
  router.get(routeConfig, async (context, request, response) => {
    let session: Session;
    try {
      session = await createSession(plugin);
    } catch (err) {
      return response.badRequest({ body: `unable to create session: ${err.message}` });
    }

    plugin.logger.info(`starting heap snapshot`);
    let snapshot;
    try {
      snapshot = await takeHeapSnapshot(session);
    } catch (err) {
      return response.badRequest({ body: `unable to take heap snapshot: ${err.message}` });
    }

    plugin.logger.info(`finished heap snapshot`);

    const fileName = new Date()
      .toISOString()
      .replace('T', '_')
      .replace(/\//g, '-')
      .replace(/:/g, '-')
      .substring(5, 19);

    return response.ok({
      body: snapshot,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}.heapsnapshot"`,
      },
    });
  });
}
