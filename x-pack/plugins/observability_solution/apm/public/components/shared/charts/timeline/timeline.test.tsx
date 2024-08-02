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
import { TimelineAxisContainer, TimelineProps, VerticalLinesContainer } from '.';
import { AgentMark } from '../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';

describe.each([[TimelineAxisContainer], [VerticalLinesContainer]])(`Timeline`, (Component) => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    mockMoment();
    consoleMock = disableConsoleWarning('Warning: componentWill');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  it(`${Component.name} should render with data`, () => {
    const props: TimelineProps = {
      xMax: 1000,
      margins: {
        top: 100,
        left: 50,
        right: 50,
        bottom: 0,
      },
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
      ] as AgentMark[],
    };

    const wrapper = mountWithTheme(<Component {...props} />);

    expect(toJson(wrapper)).toMatchSnapshot();
  });

  it(`${Component.name} should not crash if traceRootDuration is 0`, () => {
    const props: TimelineProps = {
      xMax: 0,
      margins: {
        top: 100,
        left: 50,
        right: 50,
        bottom: 0,
      },
    };

    const mountTimeline = () => mountWithTheme(<Component {...props} />);

    expect(mountTimeline).not.toThrow();
  });
});
