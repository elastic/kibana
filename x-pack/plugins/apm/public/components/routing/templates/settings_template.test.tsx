/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render } from '@testing-library/react';
import { createMemoryHistory } from 'history';
import type { ReactNode } from 'react';
import React from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { MemoryRouter } from 'react-router-dom';
import type { CoreStart } from '../../../../../../../src/core/public/types';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public/context/context';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { SettingsTemplate } from './settings_template';

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
