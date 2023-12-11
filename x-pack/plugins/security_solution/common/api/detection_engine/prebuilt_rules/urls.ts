/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_URL as RULES,
  INTERNAL_DETECTION_ENGINE_URL as INTERNAL,
} from '../../../constants';

const OLD_BASE_URL = `${RULES}/prepackaged` as const;
const NEW_BASE_URL = `${INTERNAL}/prebuilt_rules` as const;

export const PREBUILT_RULES_URL = OLD_BASE_URL;
export const PREBUILT_RULES_STATUS_URL = `${OLD_BASE_URL}/_status` as const;

export const GET_PREBUILT_RULES_STATUS_URL = `${NEW_BASE_URL}/status` as const;
export const REVIEW_RULE_UPGRADE_URL = `${NEW_BASE_URL}/upgrade/_review` as const;
export const PERFORM_RULE_UPGRADE_URL = `${NEW_BASE_URL}/upgrade/_perform` as const;
export const REVIEW_RULE_INSTALLATION_URL = `${NEW_BASE_URL}/installation/_review` as const;
export const PERFORM_RULE_INSTALLATION_URL = `${NEW_BASE_URL}/installation/_perform` as const;
