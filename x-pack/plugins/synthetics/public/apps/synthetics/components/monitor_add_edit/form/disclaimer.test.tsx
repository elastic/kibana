/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '../../../utils/testing/rtl_helpers';
import * as formContext from 'react-hook-form';
import { Disclaimer } from './disclaimer';
import { ServiceLocations } from '../types';

export const mockLocation = {
  label: 'US Central',
  id: 'us_central',
  geo: {
    lat: 1,
    lon: 1,
  },
  url: 'url',
  isServiceManaged: true,
};
describe('<Disclaimer />', () => {
  beforeEach(() => {
    jest.spyOn(formContext, 'useFormContext').mockReturnValue({
      watch: () => [[mockLocation] as ServiceLocations],
    } as unknown as formContext.UseFormReturn);
  });

  it('shows disclaimer when ', () => {
    const { getByText } = render(<Disclaimer />);

    expect(getByText(/You consent/)).toBeInTheDocument();
  });

  it('does not show disclaimer when locations are not service managed', () => {
    jest.spyOn(formContext, 'useFormContext').mockReturnValue({
      watch: () => [[{ ...mockLocation, isServiceManaged: false }] as ServiceLocations],
    } as unknown as formContext.UseFormReturn);
    const { queryByText } = render(<Disclaimer />);

    expect(queryByText(/You consent/)).not.toBeInTheDocument();
  });
});
