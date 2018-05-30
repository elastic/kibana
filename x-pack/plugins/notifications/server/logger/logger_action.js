/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, ActionResult } from '../';

export const LOGGER_ACTION_ID = 'xpack-notifications-logger';

/**
 * Logger Action enables generic logging of information into Kibana's logs.
 *
 * This is mostly useful for debugging.
 */
export class LoggerAction extends Action {

  constructor({ server }) {
    super({ server, id: LOGGER_ACTION_ID, name: 'Log' });
  }

  getMissingFields() {
    return [];
  }

  async doPerformHealthCheck() {
    return new ActionResult({
      message: `Logger action is always usable.`,
      response: { },
    });
  }

  async doPerformAction(notification) {
    this.server.log([LOGGER_ACTION_ID, 'info'], notification);

    return new ActionResult({
      message: 'Logged data returned as response.',
      response: notification
    });
  }

}
