/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CMServerLibs } from './lib/lib';
import { beatsIndexTemplate } from './utils/index_templates';

export const initManagementServer = (libs: CMServerLibs) => {
  libs.framework.installIndexTemplate('beats-template', beatsIndexTemplate);
};
