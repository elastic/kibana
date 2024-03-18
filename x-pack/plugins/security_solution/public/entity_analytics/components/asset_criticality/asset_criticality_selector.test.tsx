/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TestProviders } from '../../../common/mock';
import { render } from '@testing-library/react';
import React from 'react';
import { AssetCriticalitySelector } from './asset_criticality_selector';
import type { State } from './use_asset_criticality';

const criticality = {
  status: 'create',
  query: {},
  privileges: {
    data: {
      has_write_permissions: true,
    },
  },
  mutation: {},
} as State;

describe('AssetCriticalitySelector', () => {
  it('renders', () => {
    const { getByTestId } = render(
      <AssetCriticalitySelector
        criticality={criticality}
        entity={{ type: 'host' as const, name: 'My test Host' }}
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('asset-criticality-selector')).toBeInTheDocument();
  });

  it('renders when compressed', () => {
    const { getByTestId } = render(
      <AssetCriticalitySelector
        criticality={criticality}
        entity={{ type: 'host' as const, name: 'My test Host' }}
        compressed
      />,
      {
        wrapper: TestProviders,
      }
    );

    expect(getByTestId('asset-criticality-change-btn')).toHaveAttribute(
      'aria-label',
      'Change asset criticality'
    );
  });
});
