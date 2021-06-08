/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import React, { ReactNode } from 'react';
import { SettingsTemplate } from './settings_template';
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
        <SettingsTemplate {...routerProps}>
          <div />
        </SettingsTemplate>,
        { wrapper: Wrapper }
      )
    ).not.toThrowError();
  });
});
