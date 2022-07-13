'use strict';

import { Plugin } from '../index';
import { createDeferred } from './deferred';

let inspector: any = null;
try {
  inspector = require('inspector');
} catch (err) {
  // inspector will be null :-(
}

export async function createSession(plugin: Plugin): Promise<Session> {
  plugin.logger.debug('creating session');

  if (inspector == null) {
    throw new Error('the inspector module is not available for this version of node');
  }

  let session = null;
  try {
    session = new inspector.Session();
  } catch (err) {
    throw new Error(`error creating inspector session: ${err.message}`);
  }

  try {
    session.connect();
  } catch (err) {
    throw new Error(`error connecting inspector session: ${err.message}`);
  }

  return new Session(plugin, session);
}

export class Session {
  readonly plugin: Plugin;
  private session: any;

  constructor(plugin: Plugin, session: any) {
    this.plugin = plugin;
    this.session = session;
  }

  async destroy() {
    this.session.disconnect();
    this.session = null;
  }

  on(event: string, handler: any) {
    this.session.on(event, handler);
  }

  async post(method: string, args?: any) {
    this.plugin.logger.debug(`posting method ${method} ${JSON.stringify(args)}`);
    if (this.session == null) {
      throw new Error('session disconnected');
    }

    const deferred = createDeferred();

    this.session.post(method, args, (err: any, response: any) => {
      if (err) {
        this.plugin.logger.debug(`error from method ${method}: ${err.message}`);
        return deferred.reject(err);
      }
      deferred.resolve(response);
    });

    return deferred.promise;
  }
}
