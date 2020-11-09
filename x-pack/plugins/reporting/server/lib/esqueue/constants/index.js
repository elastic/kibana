/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { statuses } from '../../statuses';
import { defaultSettings } from './default_settings';
import { events } from './events';

export const constants = {
  ...events,
  ...statuses,
  ...defaultSettings,
};
