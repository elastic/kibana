/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { renderHook } from '@testing-library/react-hooks';
import cytoscape from 'cytoscape';
import { EuiTheme } from '../../../../../observability/public';
import { useCytoscapeEventHandlers } from './use_cytoscape_event_handlers';
import dagre from 'cytoscape-dagre';

cytoscape.use(dagre);

const theme = ({
  eui: { avatarSizing: { l: { size: 10 } } },
} as unknown) as EuiTheme;

describe('useCytoscapeEventHandlers', () => {
  describe('when cytoscape is undefined', () => {
    it('runs', () => {
      expect(() => {
        renderHook(() => useCytoscapeEventHandlers({ cy: undefined, theme }));
      }).not.toThrowError();
    });
  });

  describe('when an element is dragged', () => {
    it('sets the hasBeenDragged data', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('drag');

      expect(cy.getElementById('test').data('hasBeenDragged')).toEqual(true);
    });
  });

  describe('when a node is hovered', () => {
    it('applies the hover class', () => {
      const cy = cytoscape({
        elements: [{ data: { id: 'test' } }],
      });
      const node = cy.getElementById('test');

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      node.trigger('mouseover');

      expect(node.hasClass('hover')).toEqual(true);
    });
  });

  describe('when a node is un-hovered', () => {
    it('removes the hover class', () => {
      const cy = cytoscape({
        elements: [{ data: { id: 'test' }, classes: 'hover' }],
      });
      const node = cy.getElementById('test');

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      node.trigger('mouseout');

      expect(node.hasClass('hover')).toEqual(false);
    });
  });
});
