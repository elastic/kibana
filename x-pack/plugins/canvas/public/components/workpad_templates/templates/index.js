/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
const elasticTemplate = require('./elastic_template.json');
const conditionalAssets = require('./conditional_assets.json');

export const templates = [cloneDeep(elasticTemplate), cloneDeep(conditionalAssets)];
