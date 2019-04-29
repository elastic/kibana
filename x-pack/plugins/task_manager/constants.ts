/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import xPackage from '../../package.json';
import { getTemplateVersion } from './lib/get_template_version';

export const TASK_MANAGER_API_VERSION = 1;
export const TASK_MANAGER_TEMPLATE_VERSION = getTemplateVersion(xPackage.version);
