/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GENERAL_CASES_OWNER, OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER } from '../../common';

/**
 * This should only be used within telemetry
 */
export const OWNERS = [OBSERVABILITY_OWNER, SECURITY_SOLUTION_OWNER, GENERAL_CASES_OWNER] as const;
