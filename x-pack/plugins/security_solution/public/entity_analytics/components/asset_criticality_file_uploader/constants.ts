/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CriticalityLevels } from '../../../../common/entity_analytics/asset_criticality';

export const SUPPORTED_FILE_TYPES = ['text/csv', 'text/plain', 'text/tab-separated-values'];
export const SUPPORTED_FILE_EXTENSIONS = ['CSV', 'TXT', 'TSV'];
export const VALID_CRITICALITY_LEVELS = Object.values(CriticalityLevels);
export const MAX_FILE_LINES = 10000;
