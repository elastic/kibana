/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAgentMarks } from './get_agent_marks';

describe('getAgentMarks', () => {
  it('should sort the marks by time', () => {
    expect(
      getAgentMarks({
        domInteractive: 117,
        timeToFirstByte: 10,
        domComplete: 118,
      })
    ).toEqual([
      {
        id: 'timeToFirstByte',
        offset: 10000,
        type: 'agentMark',
        verticalLine: true,
      },
      {
        id: 'domInteractive',
        offset: 117000,
        type: 'agentMark',
        verticalLine: true,
      },
      {
        id: 'domComplete',
        offset: 118000,
        type: 'agentMark',
        verticalLine: true,
      },
    ]);
  });

  it('should return empty array if marks are missing', () => {
    expect(getAgentMarks(undefined)).toEqual([]);
  });

  it('should return empty array if agent marks are missing', () => {
    expect(getAgentMarks(undefined)).toEqual([]);
  });
});
