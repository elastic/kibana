/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { NotifyService } from '../notify';

const noop = (..._args: any[]): any => {};

export const notifyService: NotifyService = {
  error: noop,
  info: noop,
  success: noop,
  warning: noop,
};
