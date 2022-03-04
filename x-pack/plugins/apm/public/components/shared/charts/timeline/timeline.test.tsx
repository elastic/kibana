/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  disableConsoleWarning,
  mountWithTheme,
  mockMoment,
  toJson,
} from '../../../../utils/test_helpers';
import { Timeline } from '.';

describe('Timeline', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    mockMoment();
    consoleMock = disableConsoleWarning('Warning: componentWill');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it('should render with data', () => {
    const props = {
      traceRootDuration: 200000,
      width: 1000,
      duration: 200000,
      height: 116,
      margins: {
        top: 100,
        left: 50,
        right: 50,
        bottom: 0,
      },
      animation: null,
      marks: [
        {
          id: 'timeToFirstByte',
          offset: 100000,
          type: 'agentMark',
          verticalLine: true,
        },
        {
          id: 'domInteractive',
          offset: 110000,
          type: 'agentMark',
          verticalLine: true,
        },
        {
          id: 'domComplete',
          offset: 190000,
          type: 'agentMark',
          verticalLine: true,
        },
      ],
    };

    const wrapper = mountWithTheme(<Timeline {...props} />);

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it('should not crash if traceRootDuration is 0', () => {
    const props = {
      traceRootDuration: 0,
      width: 1000,
      xMax: 0,
      height: 116,
      margins: {
        top: 100,
        left: 50,
        right: 50,
        bottom: 0,
      },
    };

    const mountTimeline = () => mountWithTheme(<Timeline {...props} />);

    expect(mountTimeline).not.toThrow();
  });
});
