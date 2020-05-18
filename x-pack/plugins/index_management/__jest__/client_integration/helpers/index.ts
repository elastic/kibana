/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from 'src/plugins/es_ui_shared/public';
import { setup as homeSetup } from './home.helpers';
import { setup as templateCreateSetup } from './template_create.helpers';
import { setup as templateCloneSetup } from './template_clone.helpers';
import { setup as templateEditSetup } from './template_edit.helpers';

type TestBed = TestUtils.TestBed;
const { nextTick, getRandomString, findTestSubject } = TestUtils;

export { nextTick, getRandomString, findTestSubject, TestBed };

export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  home: { setup: homeSetup },
  templateCreate: { setup: templateCreateSetup },
  templateClone: { setup: templateCloneSetup },
  templateEdit: { setup: templateEditSetup },
};
