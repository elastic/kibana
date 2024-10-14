/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPLUNK_MIGRATIONS_PATH } from '../constants';

const SPLUNK_RULE_MIGRATIONS_PATH = `${SPLUNK_MIGRATIONS_PATH}/rules` as const;

export const SPLUNK_MATCH_PREBUILT_RULE_PATH =
  `${SPLUNK_RULE_MIGRATIONS_PATH}/match_prebuilt_rule` as const;
