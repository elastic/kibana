/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { PipelineViewer } from '../index';
import { DetailDrawer } from '../views/detail_drawer';
import { Graph } from '../models/graph';


describe('PipelineViewer component', () => {
  describe('detail drawer', () => {
    let graph;
    let timeseriesTooltipXValueFormatter;
    let pipelineState;
    let wrapper;
    let vertex;

    beforeEach(() => {
      graph = new Graph();
      graph.update({
        vertices: [
          {
            id: 'terminal_logger',
            explicit_id: true,
            type: 'plugin',
            plugin_type: 'input',
            config_name: 'stdin',
            stats: {}
          },
          {
            id: '__QUEUE__',
            explicit_id: false,
            type: 'queue',
            stats: {}
          },
          {
            id: '5y890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            explicit_id: false,
            type: 'plugin',
            plugin_type: 'output',
            config_name: 'elasticsearch',
            stats: {}
          }
        ],
        edges: [
          {
            id: '8f1gae28a11c3d99d1adf44f793763db6b9c61379e0ad518371b49aa67ef902f',
            from: 'terminal_logger',
            to: '__QUEUE__',
            type: 'plain'
          },
          {
            id: '8ue2ae28a11c3d99d1ado9f3epq0bvjd6b9c61379e0ad518371b49aa67ef902f',
            from: '__QUEUE__',
            to: '5y890f3e5c135c037eb40ba88d69b040faaeb954bb10510e95294259ffdd88e8',
            type: 'plain'
          }
        ]
      });

      timeseriesTooltipXValueFormatter = {};
      pipelineState = {
        config: {
          graph
        }
      };

      wrapper = shallow((
        <PipelineViewer
          pipelineState={pipelineState}
          timeseriesTooltipXValueFormatter={timeseriesTooltipXValueFormatter}
        />
      ));

      vertex = graph.getVertices()[0];
    });

    it('creates null vertex state by default', () => {
      expect(
        wrapper.instance().state.detailDrawer
      ).toEqual({ vertex: null });
    });

    it('is rendered for newly-selected vertex', () => {
      const component = wrapper.instance();

      component.onShowVertexDetails(vertex);

      expect(wrapper.find(DetailDrawer).length).toEqual(0);
      expect(component.state.detailDrawer.vertex).toEqual(vertex);

      wrapper.update();

      expect(wrapper.find(DetailDrawer).length).toEqual(1);
    });

    it('is hidden if current vertex is selected again', () => {
      const component = wrapper.instance();

      component.onShowVertexDetails(vertex);

      wrapper.update();

      // showing drawer for selected vertex
      expect(wrapper.find(DetailDrawer).length).toEqual(1);

      component.onShowVertexDetails(vertex);

      wrapper.update();

      // drawer toggled off for second consecutive selection of vertex
      expect(wrapper.find(DetailDrawer).length).toEqual(0);
      expect(component.state.detailDrawer.vertex).toEqual(null);
    });

    it('remains visible for new vertex', () => {
      const component = wrapper.instance();

      component.onShowVertexDetails(vertex);

      wrapper.update();

      // showing drawer for first vertex
      expect(wrapper.find(DetailDrawer).length).toEqual(1);

      // select different vertex
      const secondVertex = graph.getVertices()[1];
      component.onShowVertexDetails(secondVertex);

      wrapper.update();

      // still visible for second vertex
      expect(wrapper.find(DetailDrawer).length).toEqual(1);
      expect(component.state.detailDrawer.vertex).toEqual(secondVertex);
    });
  });
});
