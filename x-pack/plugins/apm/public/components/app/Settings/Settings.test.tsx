/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { render } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import React, { ReactNode } from 'react';
import { Settings } from './';
import { createMemoryHistory } from 'history';
import { MemoryRouter, RouteComponentProps } from 'react-router-dom';

const { location } = createMemoryHistory();

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('Settings', () => {
  it('renders', async () => {
    const routerProps = ({
      location,
    } as unknown) as RouteComponentProps<{}>;
    expect(() =>
      render(
        <Settings {...routerProps}>
          <div />
        </Settings>,
        { wrapper: Wrapper }
      )
    ).not.toThrowError();
  });
});
