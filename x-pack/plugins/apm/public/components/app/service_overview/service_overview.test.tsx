/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { CoreStart } from 'src/core/public';
import { createKibanaReactContext } from '../../../../../../../src/plugins/kibana_react/public';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { renderWithTheme } from '../../../utils/testHelpers';
import { ServiceOverview } from './';

const KibanaReactContext = createKibanaReactContext({
  usageCollection: { reportUiStats: () => {} },
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

describe('ServiceOverview', () => {
  it('renders', () => {
    expect(() =>
      renderWithTheme(<ServiceOverview serviceName="test service name" />, {
        wrapper: Wrapper,
      })
    ).not.toThrowError();
  });
});
