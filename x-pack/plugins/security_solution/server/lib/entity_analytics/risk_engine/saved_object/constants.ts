/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Public Risk Engine Saved Object Configuration routes
 */

export const APP_ID = 'securitySolution' as const;
export const PUBLIC_RISK_ENGINE_SO_URL = '/api/risk_engine/saved_object' as const;
export const RISK_ENGINE_SAVED_OBJECT_CONFIG_URL = `${PUBLIC_RISK_ENGINE_SO_URL}/config` as const;
