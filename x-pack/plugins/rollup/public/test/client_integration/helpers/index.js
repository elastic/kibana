/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TestUtils } from '../../../../../../../src/plugins/es_ui_shared/public';
import { setup as jobCreateSetup } from './job_create.helpers';
import { setup as jobListSetup } from './job_list.helpers';
import { setup as jobCloneSetup } from './job_clone.helpers';

const { nextTick, getRandomString, findTestSubject } = TestUtils;

export { nextTick, getRandomString, findTestSubject };

export { mockHttpRequest } from './setup_environment';

export { wrapComponent } from './setup_context';

export const pageHelpers = {
  jobCreate: { setup: jobCreateSetup },
  jobList: { setup: jobListSetup },
  jobClone: { setup: jobCloneSetup },
};
