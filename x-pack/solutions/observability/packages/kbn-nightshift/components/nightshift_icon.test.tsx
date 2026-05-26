/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { useEuiTheme } from '@elastic/eui';
import { NightshiftIcon } from './nightshift_icon';

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    useEuiTheme: jest.fn(),
  };
});

jest.mock('../assets/nightshift_icon.svg', () => 'nightshift-icon-light.svg', { virtual: true });
jest.mock('../assets/nightshift_icon_dark.svg', () => 'nightshift-icon-dark.svg', {
  virtual: true,
});

const useEuiThemeMock = useEuiTheme as jest.MockedFunction<typeof useEuiTheme>;

describe('NightshiftIcon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the theme is light', () => {
    beforeEach(() => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'LIGHT',
      } as ReturnType<typeof useEuiTheme>);
    });

    it('renders the light icon', () => {
      const { container } = render(<NightshiftIcon />);
      const icon = container.querySelector('[data-euiicon-type]');
      expect(icon).toHaveAttribute('data-euiicon-type', 'nightshift-icon-light.svg');
    });
  });

  describe('when the theme is dark', () => {
    beforeEach(() => {
      useEuiThemeMock.mockReturnValue({
        colorMode: 'DARK',
      } as ReturnType<typeof useEuiTheme>);
    });

    it('renders the dark icon', () => {
      const { container } = render(<NightshiftIcon />);
      const icon = container.querySelector('[data-euiicon-type]');
      expect(icon).toHaveAttribute('data-euiicon-type', 'nightshift-icon-dark.svg');
    });
  });
});
