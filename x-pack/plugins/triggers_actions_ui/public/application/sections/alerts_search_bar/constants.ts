/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AlertConsumers } from '@kbn/rule-data-utils';

export const NO_INDEX_PATTERNS: DataView[] = [];
export const ALERTS_URL_STORAGE_KEY = '_a';
export const ALL_FEATURE_IDS = Object.values(AlertConsumers);
export const NON_SIEM_FEATURE_IDS = ALL_FEATURE_IDS.filter((fid) => fid !== AlertConsumers.SIEM);
