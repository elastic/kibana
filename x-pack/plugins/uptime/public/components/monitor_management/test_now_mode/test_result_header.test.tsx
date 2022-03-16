/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { TestResultHeader } from './test_result_header';

describe('TestResultHeader', function () {
  it('should render properly', async function () {
    render(<TestResultHeader isCompleted={false} />);
    expect(await screen.findByText('Test result')).toBeInTheDocument();
    expect(await screen.findByText('PENDING')).toBeInTheDocument();
  });

  it('should render in progress state', async function () {
    render(<TestResultHeader journeyStarted={true} isCompleted={false} />);

    expect(await screen.findByText('Test result')).toBeInTheDocument();
    expect(await screen.findByText('IN PROGRESS')).toBeInTheDocument();
  });

  it('should render completed state', async function () {
    render(
      <TestResultHeader
        isCompleted={true}
        summaryDocs={[
          {
            monitor: {
              duration: {
                us: 1000,
              },
            },
          } as any,
        ]}
      />
    );
    expect(await screen.findByText('Test result')).toBeInTheDocument();
    expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
    expect(await screen.findByText('Took 1 ms')).toBeInTheDocument();
  });
});
