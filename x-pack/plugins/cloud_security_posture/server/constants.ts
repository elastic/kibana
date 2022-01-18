/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const RULE_PASSED = `passed`;
export const RULE_FAILED = `failed`;
export const SECURITY_SOLUTION_APP_ID = 'securitySolution';

/** This Kibana Advanced Setting enables the `Cloud Security Posture` beta feature */
export const ENABLE_CSP = 'securitySolution:enableCloudSecurityPosture' as const;
