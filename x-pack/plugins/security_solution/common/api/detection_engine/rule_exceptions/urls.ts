/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DETECTION_ENGINE_RULES_URL as PUBLIC_RULES_URL,
  INTERNAL_DETECTION_ENGINE_URL as INTERNAL_URL,
} from '../../../constants';

const INTERNAL_RULES_URL = `${INTERNAL_URL}/rules`;

export const CREATE_RULE_EXCEPTIONS_URL = `${PUBLIC_RULES_URL}/{id}/exceptions`;
export const DETECTION_ENGINE_RULES_EXCEPTIONS_REFERENCE_URL =
  `${INTERNAL_RULES_URL}/exceptions/_find_references` as const;
