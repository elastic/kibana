/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { LandingPageComponent } from '.';

const mockUseContractComponents = jest.fn(() => ({}));
jest.mock('../../hooks/use_contract_component', () => ({
  useContractComponents: () => mockUseContractComponents(),
}));
jest.mock('../../containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({ indicesExist: false }),
}));

describe('LandingPageComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the get started component', () => {
    const GetStarted = () => <div data-test-subj="get-started-mock" />;
    mockUseContractComponents.mockReturnValue({ GetStarted });
    const { queryByTestId } = render(<LandingPageComponent />);

    expect(queryByTestId('get-started-mock')).toBeInTheDocument();
  });
});
