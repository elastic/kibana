/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMServerLibs } from './lib/lib';
import { createBeatEnrollmentRoute } from './rest_api/beats/enroll';
import { createListAgentsRoute } from './rest_api/beats/list';
import { createTagAssignmentRoute } from './rest_api/beats/tag_assignment';
import { createTagRemovalRoute } from './rest_api/beats/tag_removal';
import { createSetTagRoute } from './rest_api/tags/set';
import { createTokenRoute } from './rest_api/tokens/create';

import { beatsIndexTemplate } from './utils/index_templates';

export const initManagementServer = (libs: CMServerLibs) => {
  libs.framework.installIndexTemplate('beats-template', beatsIndexTemplate);
  libs.framework.registerRoute(createTagAssignmentRoute(libs));
  libs.framework.registerRoute(createListAgentsRoute(libs));
  libs.framework.registerRoute(createTagRemovalRoute(libs));
  libs.framework.registerRoute(createBeatEnrollmentRoute(libs));
  libs.framework.registerRoute(createSetTagRoute(libs));
  libs.framework.registerRoute(createTokenRoute(libs));
};
