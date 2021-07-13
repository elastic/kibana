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
import { CoreStart } from 'kibana/public';
import { createKibanaReactContext } from 'src/plugins/kibana_react/public';

const { location } = createMemoryHistory();

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiCounter: () => {} },
  observability: {
    navigation: {
      PageTemplate: () => {
        return <>hello world</>;
      },
    },
  },
} as Partial<CoreStart>);

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <MemoryRouter>
      <KibanaReactContext.Provider>
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </KibanaReactContext.Provider>
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
        <SettingsTemplate selectedTab="agent-configurations" {...routerProps}>
          <div>hello world</div>
        </SettingsTemplate>,
        { wrapper: Wrapper }
      )
    ).not.toThrowError();
  });
});
