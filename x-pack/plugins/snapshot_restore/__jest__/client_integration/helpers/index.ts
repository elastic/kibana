/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './mocks';
import { setup as homeSetup } from './home.helpers';
import { setup as repositoryAddSetup } from './repository_add.helpers';
import { setup as repositoryEditSetup } from './repository_edit.helpers';
import { setup as policyAddSetup } from './policy_add.helpers';
import { setup as policyEditSetup } from './policy_edit.helpers';
import { setup as restoreSnapshotSetup } from './restore_snapshot.helpers';

export { nextTick, getRandomString, findTestSubject, TestBed, delay } from '@kbn/test/jest';

export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  home: { setup: homeSetup },
  repositoryAdd: { setup: repositoryAddSetup },
  repositoryEdit: { setup: repositoryEditSetup },
  policyAdd: { setup: policyAddSetup },
  policyEdit: { setup: policyEditSetup },
  restoreSnapshot: { setup: restoreSnapshotSetup },
};
