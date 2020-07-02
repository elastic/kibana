/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { act, wait } from '@testing-library/react';
import cytoscape from 'cytoscape';
import { CytoscapeContext } from './Cytoscape';
import { EmptyBanner } from './EmptyBanner';
import { MockApmPluginContextWrapper } from '../../../context/ApmPluginContext/MockApmPluginContext';
import { renderWithTheme } from '../../../utils/testHelpers';

const cy = cytoscape({});

const wrapper: FunctionComponent = ({ children }) => (
  <MockApmPluginContextWrapper>
    <CytoscapeContext.Provider value={cy}>{children}</CytoscapeContext.Provider>
  </MockApmPluginContextWrapper>
);

describe('EmptyBanner', () => {
  describe('when cy is undefined', () => {
    it('renders null', () => {
      const noCytoscapeWrapper: FunctionComponent = ({ children }) => (
        <MockApmPluginContextWrapper>
          <CytoscapeContext.Provider value={undefined}>
            {children}
          </CytoscapeContext.Provider>
        </MockApmPluginContextWrapper>
      );
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
        await wait(() => {
          expect(component.container.children.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
