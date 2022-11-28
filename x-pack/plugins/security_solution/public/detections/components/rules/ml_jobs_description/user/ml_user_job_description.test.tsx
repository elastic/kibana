/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TestProviders } from '../../../../../common/mock';

import { MlUserJobDescription } from './ml_user_job_description';

jest.mock('../../../../../common/lib/kibana');

import { mockOpenedJob } from '../../../../../common/components/ml_popover/api.mock';

describe('MlUserJobDescription', () => {
  it('should render switch component disabled', () => {
    render(<MlUserJobDescription job={mockOpenedJob} />, { wrapper: TestProviders });
    expect(screen.getByTestId('ml-user-job-switch')).toBeDisabled();
  });

  it('should render toast that shows admin permissions required', async () => {
    render(<MlUserJobDescription job={mockOpenedJob} />, { wrapper: TestProviders });

    userEvent.hover(screen.getByTestId('ml-user-job-switch').parentNode as Element);

    expect(
      await screen.findByText('ML Admin Permissions required to perform this action')
    ).toBeInTheDocument();
  });
});
