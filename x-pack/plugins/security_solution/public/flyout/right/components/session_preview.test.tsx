/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import { useProcessData } from '../hooks/use_process_data';
import { SessionPreview } from './session_preview';
import { TestProviders } from '../../../common/mock';
import React from 'react';

jest.mock('../hooks/use_process_data');

describe('SessionPreview', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders session preview with all data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: '2022-01-01T00:00:00.000Z',
      rule: 'rule1',
      workdir: '/path/to/workdir',
      command: 'command1',
    });

    render(
      <TestProviders>
        <SessionPreview />
      </TestProviders>
    );

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.getByText('at')).toBeInTheDocument();
    expect(screen.getByText('2022-01-01T00:00:00.000Z')).toBeInTheDocument();
    expect(screen.getByText('with alert')).toBeInTheDocument();
    expect(screen.getByText('rule1')).toBeInTheDocument();
    expect(screen.getByText('by')).toBeInTheDocument();
    expect(screen.getByText('/path/to/workdir command1')).toBeInTheDocument();
  });

  it('renders session preview without optional data', () => {
    jest.mocked(useProcessData).mockReturnValue({
      processName: 'process1',
      userName: 'user1',
      startAt: undefined,
      rule: undefined,
      command: undefined,
      workdir: undefined,
    });

    render(
      <TestProviders>
        <SessionPreview />
      </TestProviders>
    );

    expect(screen.getByText('user1')).toBeInTheDocument();
    expect(screen.getByText('started')).toBeInTheDocument();
    expect(screen.getByText('process1')).toBeInTheDocument();
    expect(screen.queryByText('at')).not.toBeInTheDocument();
    expect(screen.queryByText('with alert')).not.toBeInTheDocument();
    expect(screen.queryByText('by')).not.toBeInTheDocument();
  });
});
