/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor } from '@testing-library/react';
import cytoscape from 'cytoscape';
import React, { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MockApmPluginContextWrapper } from '../../../context/apm_plugin/mock_apm_plugin_context';
import { renderWithTheme } from '../../../utils/test_helpers';
import { CytoscapeContext } from './cytoscape';
import { EmptyBanner } from './empty_banner';

const cy = cytoscape({});

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <MockApmPluginContextWrapper>
        <CytoscapeContext.Provider value={cy}>
          {children}
        </CytoscapeContext.Provider>
      </MockApmPluginContextWrapper>
    </MemoryRouter>
  );
}

describe('EmptyBanner', () => {
  describe('when cy is undefined', () => {
    it('renders null', () => {
      function noCytoscapeWrapper({ children }: { children: ReactNode }) {
        return (
          <MockApmPluginContextWrapper>
            <CytoscapeContext.Provider value={undefined}>
              {children}
            </CytoscapeContext.Provider>
          </MockApmPluginContextWrapper>
        );
      }
      const component = renderWithTheme(<EmptyBanner />, {
        wrapper: noCytoscapeWrapper,
      });

      expect(component.container.children).toHaveLength(0);
    });
  });

  describe('with no nodes', () => {
    it('renders null', () => {
      const component = renderWithTheme(<EmptyBanner />, {
        wrapper,
      });

      expect(component.container.children).toHaveLength(0);
    });
  });

  describe('with one node', () => {
    it('does not render null', async () => {
      const component = renderWithTheme(<EmptyBanner />, { wrapper });

      await act(async () => {
        cy.add({ data: { id: 'test id' } });
        await waitFor(() => {
          expect(component.container.children.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
