/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { LandingCards } from './landing_cards';
import { ADD_DATA_PATH } from '@kbn/security-solution-plugin/common';
import { useVariation } from '../common/hooks/use_variation';

jest.mock('../common/hooks/use_variation');
jest.mock('../common/services');

describe('LandingCards component', () => {
  beforeEach(() => {
    (useVariation as jest.Mock).mockReset();
  });

  it('has add data links', () => {
    const { getAllByText } = render(<LandingCards />);
    expect(getAllByText('Add security integrations')).toHaveLength(2);
  });

  describe.each(['header', 'footer'])('URLs at the %s', (place) => {
    it('points to the default Add data URL', () => {
      const { queryByTestId } = render(<LandingCards />);
      const link = queryByTestId(`add-integrations-${place}`);
      expect(link?.getAttribute('href')).toBe(ADD_DATA_PATH);
    });

    it('points to the resolved Add data URL by useVariation', () => {
      const customResolvedUrl = '/test/url';
      (useVariation as jest.Mock).mockImplementationOnce(
        (cloudExperiments, featureFlagName, defaultValue, setter) => {
          setter(customResolvedUrl);
        }
      );

      const { queryByTestId } = render(<LandingCards />);
      const link = queryByTestId(`add-integrations-${place}`);
      expect(link?.getAttribute('href')).toBe(customResolvedUrl);
    });
  });
});
