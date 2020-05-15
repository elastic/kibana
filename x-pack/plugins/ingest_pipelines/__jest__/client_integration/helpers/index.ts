/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setup as pipelinesListSetup } from './pipelines_list.helpers';
import { setup as pipelinesCreateSetup } from './pipelines_create.helpers';
import { setup as pipelinesCloneSetup } from './pipelines_clone.helpers';
import { setup as pipelinesEditSetup } from './pipelines_edit.helpers';

export { nextTick, getRandomString, findTestSubject } from '../../../../../test_utils';

export { setupEnvironment } from './setup_environment';

export const pageHelpers = {
  pipelinesList: { setup: pipelinesListSetup },
  pipelinesCreate: { setup: pipelinesCreateSetup },
  pipelinesClone: { setup: pipelinesCloneSetup },
  pipelinesEdit: { setup: pipelinesEditSetup },
};
