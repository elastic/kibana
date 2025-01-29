/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import type { ReactNode } from 'react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { Controls } from './controls';
import { CytoscapeContext } from './cytoscape';
import { renderWithTheme } from '../../../utils/test_helpers';

const cy = cytoscape({
  elements: [{ classes: 'primary', data: { id: 'test node' } }],
});

function Wrapper({ children }: { children?: ReactNode }) {
  return (
    <CytoscapeContext.Provider value={cy}>
      <MemoryRouter
        initialEntries={[
          '/service-map?rangeFrom=now-15m&rangeTo=now&environment=ENVIRONMENT_ALL&kuery=',
        ]}
      >
        <MockApmPluginContextWrapper>{children}</MockApmPluginContextWrapper>
      </MemoryRouter>
    </CytoscapeContext.Provider>
  );
}

describe('Controls', () => {
  describe('with a primary node', () => {
    it('links to the full map', async () => {
      const result = renderWithTheme(<Controls />, { wrapper: Wrapper });
      const { findByTestId } = result;

      const button = await findByTestId('viewFullMapButton');

      expect(button.getAttribute('href')).toEqual('/basepath/app/apm/service-map');
    });
  });
});
