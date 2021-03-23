/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import cytoscape from 'cytoscape';
import React, { ReactNode } from 'react';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { Controls } from './Controls';
import { CytoscapeContext } from './Cytoscape';

const cy = cytoscape({
  elements: [{ classes: 'primary', data: { id: 'test node' } }],
});

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <CytoscapeContext.Provider value={cy}>
      <MockApmPluginContextWrapper>
        <EuiThemeProvider>{children}</EuiThemeProvider>
      </MockApmPluginContextWrapper>
    </CytoscapeContext.Provider>
  );
}

describe('Controls', () => {
  describe('with a primary node', () => {
    it('links to the full map', async () => {
      const result = render(<Controls />, { wrapper: Wrapper });
      const { findByTestId } = result;

      const button = await findByTestId('viewFullMapButton');

      expect(button.getAttribute('href')).toEqual(
        '/basepath/app/apm/service-map'
      );
    });
  });
});
