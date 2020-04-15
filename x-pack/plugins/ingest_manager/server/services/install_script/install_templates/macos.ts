/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';
import { InstallTemplateFunction } from './types';

const PROJECT_ROOT = resolve(__dirname, '../../../../');
export const macosInstallTemplate: InstallTemplateFunction = variables => `#!/bin/sh

eval "node ${PROJECT_ROOT}/scripts/dev_agent --enrollmentApiKey=$API_KEY --kibanaUrl=${variables.kibanaUrl}"

`;
