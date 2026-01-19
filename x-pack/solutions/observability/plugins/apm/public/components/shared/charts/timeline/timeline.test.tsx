/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import type { TimelineProps } from '.';
import { TimelineAxisContainer, VerticalLinesContainer } from '.';
import type { AgentMark } from '../../../app/transaction_details/waterfall_with_summary/waterfall_container/marks/get_agent_marks';
import { mockMoment, disableConsoleWarning } from '../../../../utils/test_helpers';
import { renderWithTheme } from '../../../../utils/test_helpers';

describe('Timeline Components', () => {
  let consoleMock: jest.SpyInstance;

  beforeAll(() => {
    mockMoment();
    consoleMock = disableConsoleWarning('Warning: componentWill');
  });

  afterAll(() => {
    consoleMock.mockRestore();
  });

  const commonProps: TimelineProps = {
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

  it('renders TimelineAxisContainer with data', () => {
    renderWithTheme(<TimelineAxisContainer {...commonProps} />);

    const timeline = screen.getByTestId('timeline-axis-container');
    expect(timeline).toBeInTheDocument();
    expect(timeline).toMatchSnapshot();
  });

  it('renders VerticalLinesContainer with data', () => {
    renderWithTheme(<VerticalLinesContainer {...commonProps} />);

    const verticalLines = screen.getByTestId('vertical-lines');
    expect(verticalLines).toBeInTheDocument();
    expect(verticalLines).toMatchSnapshot();
  });

  it('renders TimelineAxisContainer with zero duration', () => {
    const zeroProps = {
      ...commonProps,
      xMax: 0,
      marks: undefined,
    };

    renderWithTheme(<TimelineAxisContainer {...zeroProps} />);

    const timeline = screen.getByTestId('timeline-axis-container');
    expect(timeline).toBeInTheDocument();
  });

  it('renders VerticalLinesContainer with zero duration', () => {
    const zeroProps = {
      ...commonProps,
      xMax: 0,
      marks: undefined,
    };

    renderWithTheme(<VerticalLinesContainer {...zeroProps} />);

    const verticalLines = screen.getByTestId('vertical-lines');
    expect(verticalLines).toBeInTheDocument();
  });
});
