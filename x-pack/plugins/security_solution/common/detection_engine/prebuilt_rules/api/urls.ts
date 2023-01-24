/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL as RULES } from '../../../constants';

export const PREBUILT_RULES_URL = `${RULES}/prepackaged` as const;
export const PREBUILT_RULES_STATUS_URL = `${RULES}/prepackaged/_status` as const;
