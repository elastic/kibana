/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import React, { ReactNode } from 'react';
import { Settings } from './';
import { LocationContext } from '../../../context/LocationContext';
import { createMemoryHistory } from 'history';

function Wrapper({ children }: { children?: ReactNode }) {
  const { location } = createMemoryHistory();
  return (
    <LocationContext.Provider value={location}>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </LocationContext.Provider>
  );
}

describe('Settings', () => {
  it('renders', async () => {
    expect(() =>
      render(
        <Settings>
          <div />
        </Settings>,
        { wrapper: Wrapper }
      )
    ).not.toThrowError();
  });
});
