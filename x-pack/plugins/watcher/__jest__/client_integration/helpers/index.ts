/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { setup as watchListSetup } from './watch_list.helpers';
import { setup as watchStatusSetup } from './watch_status.helpers';
import { setup as watchCreateJsonSetup } from './watch_create_json.helpers';
import { setup as watchCreateThresholdSetup } from './watch_create_threshold.helpers';
import { setup as watchEditSetup } from './watch_edit.helpers';

export type { TestBed } from '@kbn/test-jest-helpers';
export { getRandomString, findTestSubject } from '@kbn/test-jest-helpers';
export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  watchList: { setup: watchListSetup },
  watchStatus: { setup: watchStatusSetup },
  watchCreateJson: { setup: watchCreateJsonSetup },
  watchCreateThreshold: { setup: watchCreateThresholdSetup },
  watchEdit: { setup: watchEditSetup },
};
