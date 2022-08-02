/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import cytoscape from 'cytoscape';
import dagre from 'cytoscape-dagre';
import { EuiTheme } from '@kbn/kibana-react-plugin/common';
import { useUiTracker } from '@kbn/observability-plugin/public';
import { useCytoscapeEventHandlers } from './use_cytoscape_event_handlers';
import lodash from 'lodash';

jest.mock('@kbn/observability-plugin/public');

cytoscape.use(dagre);

const theme = {
  eui: { avatarSizing: { l: { size: 10 } } },
} as unknown as EuiTheme;

describe('useCytoscapeEventHandlers', () => {
  describe('when cytoscape is undefined', () => {
    it('runs', () => {
      expect(() => {
        renderHook(() => useCytoscapeEventHandlers({ cy: undefined, theme }));
      }).not.toThrowError();
    });
  });

  describe('when data is received', () => {
    describe('with a service name', () => {
      it('sets the primary class', () => {
        const cy = cytoscape({
          elements: [{ data: { id: 'test' } }],
        });

        // Mock the chain that leads to layout run
        jest.spyOn(cy, 'elements').mockReturnValueOnce({
          difference: () =>
            ({
              layout: () => ({ run: () => {} } as unknown as cytoscape.Layouts),
            } as unknown as cytoscape.CollectionReturnValue),
        } as unknown as cytoscape.CollectionReturnValue);

        renderHook(() =>
          useCytoscapeEventHandlers({ serviceName: 'test', cy, theme })
        );
        cy.trigger('custom:data');

        expect(cy.getElementById('test').hasClass('primary')).toEqual(true);
      });
    });

    it('runs the layout', () => {
      const cy = cytoscape({
        elements: [{ data: { id: 'test' } }],
      });
      const run = jest.fn();

      // Mock the chain that leads to layout run
      jest.spyOn(cy, 'elements').mockReturnValueOnce({
        difference: () =>
          ({
            layout: () => ({ run } as unknown as cytoscape.Layouts),
          } as unknown as cytoscape.CollectionReturnValue),
      } as unknown as cytoscape.CollectionReturnValue);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.trigger('custom:data');

      expect(run).toHaveBeenCalled();
    });
  });

  describe('when layoutstop is triggered', () => {
    it('applies cubic bézier styles', () => {
      const cy = cytoscape({
        elements: [
          { data: { id: 'test', source: 'a', target: 'b' } },
          { data: { id: 'a' } },
          { data: { id: 'b' } },
        ],
      });
      const edge = cy.getElementById('test');
      const style = jest.spyOn(edge, 'style');

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.trigger('layoutstop');

      expect(style).toHaveBeenCalledWith('control-point-distances', [-0, 0]);
    });
  });

  describe('when an element is dragged', () => {
    it('sets the hasBeenDragged data', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const node = cy.getElementById('test');

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      node.trigger('drag');

      expect(node.data('hasBeenDragged')).toEqual(true);
    });

    describe('when it has already been dragged', () => {
      it('keeps hasBeenDragged as true', () => {
        const cy = cytoscape({
          elements: [{ data: { hasBeenDragged: true, id: 'test' } }],
        });
        const node = cy.getElementById('test');

        renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
        node.trigger('drag');

        expect(node.data('hasBeenDragged')).toEqual(true);
      });
    });
  });

  describe('when a drag ends', () => {
    it('changes the cursor to pointer', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const container = {
        style: { cursor: 'grabbing' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('dragfree');

      expect(container.style.cursor).toEqual('pointer');
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

    it('sets the cursor to pointer', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const container = {
        style: { cursor: 'default' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('mouseover');

      expect(container.style.cursor).toEqual('pointer');
    });

    it('tracks an event', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const trackApmEvent = jest.fn();
      (useUiTracker as jest.Mock).mockReturnValueOnce(trackApmEvent);
      jest.spyOn(lodash, 'debounce').mockImplementationOnce((fn: any) => {
        fn();
        return fn;
      });

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('mouseover');

      expect(trackApmEvent).toHaveBeenCalledWith({
        metric: 'service_map_node_or_edge_hover',
      });
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

    it('sets the cursor to the default', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const container = {
        style: { cursor: 'pointer' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('mouseout');

      expect(container.style.cursor).toEqual('grab');
    });
  });

  describe('when an edge is hovered', () => {
    it('does not set the cursor to pointer', () => {
      const cy = cytoscape({
        elements: [
          { data: { id: 'test', source: 'a', target: 'b' } },
          { data: { id: 'a' } },
          { data: { id: 'b' } },
        ],
      });
      const container = {
        style: { cursor: 'default' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('mouseover');

      expect(container.style.cursor).toEqual('default');
    });
  });

  describe('when a node is selected', () => {
    it('tracks an event', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      const trackApmEvent = jest.fn();
      (useUiTracker as jest.Mock).mockReturnValueOnce(trackApmEvent);
      jest.spyOn(lodash, 'debounce').mockImplementationOnce((fn: any) => {
        fn();
        return fn;
      });

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('select');

      expect(trackApmEvent).toHaveBeenCalledWith({
        metric: 'service_map_node_select',
      });
    });
  });

  describe('when a node is unselected', () => {
    it('resets connected edge styles', () => {
      const cy = cytoscape({
        elements: [
          { data: { id: 'test' } },
          { data: { id: 'edge', source: 'test', target: 'test2' } },
          { data: { id: 'test2' } },
        ],
      });

      renderHook(() =>
        useCytoscapeEventHandlers({
          serviceName: 'test',
          cy,
          theme,
        })
      );
      cy.getElementById('test').trigger('unselect');

      expect(cy.getElementById('edge').hasClass('highlight')).toEqual(true);
    });
  });

  describe('when a tap starts', () => {
    it('sets the cursor to grabbing', () => {
      const cy = cytoscape({});
      const container = {
        style: { cursor: 'grab' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.trigger('tapstart');

      expect(container.style.cursor).toEqual('grabbing');
    });

    describe('when the target is a node', () => {
      it('does not change the cursor', () => {
        const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
        const container = {
          style: { cursor: 'grab' },
        } as unknown as HTMLElement;
        jest.spyOn(cy, 'container').mockReturnValueOnce(container);

        renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
        cy.getElementById('test').trigger('tapstart');

        expect(container.style.cursor).toEqual('grab');
      });
    });
  });

  describe('when a tap ends', () => {
    it('sets the cursor to the default', () => {
      const cy = cytoscape({});
      const container = {
        style: { cursor: 'grabbing' },
      } as unknown as HTMLElement;
      jest.spyOn(cy, 'container').mockReturnValueOnce(container);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.trigger('tapend');

      expect(container.style.cursor).toEqual('grab');
    });

    describe('when the target is a node', () => {
      it('does not change the cursor', () => {
        const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
        const container = {
          style: { cursor: 'pointer' },
        } as unknown as HTMLElement;
        jest.spyOn(cy, 'container').mockReturnValueOnce(container);

        renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
        cy.getElementById('test').trigger('tapend');

        expect(container.style.cursor).toEqual('pointer');
      });
    });
  });

  describe('when debug is enabled', () => {
    it('logs a debug message', () => {
      const cy = cytoscape({ elements: [{ data: { id: 'test' } }] });
      (useUiTracker as jest.Mock).mockReturnValueOnce(() => {});
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValueOnce('true');
      const debug = jest
        .spyOn(window.console, 'debug')
        .mockReturnValueOnce(undefined);

      renderHook(() => useCytoscapeEventHandlers({ cy, theme }));
      cy.getElementById('test').trigger('select');

      expect(debug).toHaveBeenCalled();
    });
  });
});
