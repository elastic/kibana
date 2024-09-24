/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAssistantTools } from '.';

describe('getAssistantTools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return an array of applicable tools', () => {
    const tools = getAssistantTools(true);

    const minExpectedTools = 3; // 3 tools are currently implemented

    expect(tools.length).toBeGreaterThanOrEqual(minExpectedTools);
  });
});
