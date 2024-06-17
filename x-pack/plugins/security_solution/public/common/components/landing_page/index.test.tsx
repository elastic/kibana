/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { LandingPageComponent } from '.';

jest.mock('../../../sourcerer/containers', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({ indicesExist: false }),
}));
jest.mock('./onboarding');

describe('LandingPageComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the onboarding component', () => {
    const { queryByTestId } = render(<LandingPageComponent />);

    expect(queryByTestId('onboarding-with-settings')).toBeInTheDocument();
  });
});
