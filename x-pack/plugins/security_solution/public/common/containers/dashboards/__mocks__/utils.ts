/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOCK_TAG_ID, DEFAULT_DASHBOARDS_RESPONSE } from '../api/__mocks__';

export const getSecurityTagIds = jest.fn().mockResolvedValue([MOCK_TAG_ID]);

export const getSecurityDashboards = jest.fn().mockResolvedValue(DEFAULT_DASHBOARDS_RESPONSE);
