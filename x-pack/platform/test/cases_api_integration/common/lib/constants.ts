/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  GENERAL_CASES_OWNER,
  OBSERVABILITY_OWNER,
  SECURITY_SOLUTION_OWNER,
} from '@kbn/cases-plugin/common/constants';
import { constructFileKindIdByOwner } from '@kbn/cases-plugin/common/files';

export const SECURITY_SOLUTION_FILE_KIND = constructFileKindIdByOwner(SECURITY_SOLUTION_OWNER);
export const OBSERVABILITY_FILE_KIND = constructFileKindIdByOwner(OBSERVABILITY_OWNER);
export const CASES_FILE_KIND = constructFileKindIdByOwner(GENERAL_CASES_OWNER);

/**
 * The scheduled attack discovery fixture, laid out the way the alerting framework lays out
 * `.internal.alerts-security.attack.discovery.alerts-default-000001`: a hidden backing index behind a
 * hidden write alias. The `test-cases` namespace keeps it clear of the per-space index templates the
 * framework installs (`.internal.alerts-security.attack.discovery.alerts-<space id>-*`).
 *
 * Defined here rather than next to the attack fixtures because `authentication/roles.ts` grants read
 * on the alias.
 */
export const ATTACK_DISCOVERY_TEST_BACKING_INDEX =
  '.internal.alerts-security.attack.discovery.alerts-test-cases-000001';
export const ATTACK_DISCOVERY_TEST_ALIAS = '.alerts-security.attack.discovery.alerts-test-cases';
