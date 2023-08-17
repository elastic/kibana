/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { TestProviders } from '../common/mock';
import { RulesLandingHeader } from './landing';

const mockUseUserData = jest.fn().mockReturnValue([{ canUserCRUD: true }]);

jest.mock('../detections/components/user_info', () => ({
  useUserData: () => mockUseUserData(),
}));

describe('Rules landing page header', () => {
  it('renders', () => {
    const { queryByTestId } = render(<RulesLandingHeader />, { wrapper: TestProviders });
    expect(queryByTestId(`ruleLandingHeader`)).toBeInTheDocument();
  });

  it('should disable "create rule" when user has no CRUD access', () => {
    mockUseUserData.mockReturnValue([{ canUserCRUD: false }]);

    const { queryByTestId } = render(<RulesLandingHeader />, { wrapper: TestProviders });

    expect(queryByTestId(`createRuleBtn`)).toHaveAttribute('disabled');
  });
});
