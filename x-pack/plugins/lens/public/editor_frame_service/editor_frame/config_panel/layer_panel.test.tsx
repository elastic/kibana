/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import {
  createMockVisualization,
  createMockFramePublicAPI,
  createMockDatasource,
  DatasourceMock,
} from '../../mocks';
import { EuiFormRow, EuiPopover } from '@elastic/eui';
import { mount } from 'enzyme';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { Visualization } from '../../../types';
import { LayerPanel } from './layer_panel';
import { coreMock } from 'src/core/public/mocks';
import { generateId } from '../../../id_generator';

jest.mock('../../../id_generator');

describe('LayerPanel', () => {
  let mockVisualization: jest.Mocked<Visualization>;
  let mockDatasource: DatasourceMock;

  function getDefaultProps() {
    const frame = createMockFramePublicAPI();
    frame.datasourceLayers = {
      first: mockDatasource.publicAPIMock,
    };
    return {
      layerId: 'first',
      activeVisualizationId: 'vis1',
      visualizationMap: {
        vis1: mockVisualization,
      },
      activeDatasourceId: 'ds1',
      datasourceMap: {
        ds1: mockDatasource,
      },
      datasourceStates: {
        ds1: {
          isLoading: false,
          state: 'state',
        },
      },
      visualizationState: 'state',
      updateVisualization: jest.fn(),
      updateDatasource: jest.fn(),
      updateAll: jest.fn(),
      framePublicAPI: frame,
      isOnlyLayer: true,
      onRemoveLayer: jest.fn(),
      dispatch: jest.fn(),
      core: coreMock.createStart(),
    };
  }

  beforeEach(() => {
    mockVisualization = {
      ...createMockVisualization(),
      id: 'testVis',
      visualizationTypes: [
        {
          icon: 'empty',
          id: 'testVis',
          label: 'TEST1',
        },
      ],
    };

    mockVisualization.getLayerIds.mockReturnValue(['first']);
    mockDatasource = createMockDatasource('ds1');
  });

  it('should fail to render if the public API is out of date', () => {
    const props = getDefaultProps();
    props.framePublicAPI.datasourceLayers = {};
    const component = mountWithIntl(<LayerPanel {...props} />);
    expect(component.isEmptyRender()).toBe(true);
  });

  it('should fail to render if the active visualization is missing', () => {
    const component = mountWithIntl(
      <LayerPanel {...getDefaultProps()} activeVisualizationId="missing" />
    );
    expect(component.isEmptyRender()).toBe(true);
  });

  describe('layer reset and remove', () => {
    it('should show the reset button when single layer', () => {
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);
      expect(component.find('[data-test-subj="lns_layer_remove"]').first().text()).toContain(
        'Reset layer'
      );
    });

    it('should show the delete button when multiple layers', () => {
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} isOnlyLayer={false} />);
      expect(component.find('[data-test-subj="lns_layer_remove"]').first().text()).toContain(
        'Delete layer'
      );
    });

    it('should call the clear callback', () => {
      const cb = jest.fn();
      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} onRemoveLayer={cb} />);
      act(() => {
        component.find('[data-test-subj="lns_layer_remove"]').first().simulate('click');
      });
      expect(cb).toHaveBeenCalled();
    });
  });

  describe('single group', () => {
    it('should render the non-editable state', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: ['x'],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component.find('DragDrop[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
    });

    it('should render the group with a way to add a new column', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component.find('DragDrop[data-test-subj="lnsGroup"]');
      expect(group).toHaveLength(1);
    });

    it('should render the required warning when only one group is configured', () => {
      mockVisualization.getConfiguration.mockReturnValue({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: ['x'],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
          {
            groupLabel: 'B',
            groupId: 'b',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
            required: true,
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component
        .find(EuiFormRow)
        .findWhere((e) => e.prop('error') === 'Required dimension');
      expect(group).toHaveLength(1);
    });

    it('should render the datasource and visualization panels inside the dimension popover', () => {
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: ['newid'],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
            enableDimensionEditor: true,
          },
        ],
      });
      mockVisualization.renderDimensionEditor = jest.fn();

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component.find('DimensionPopover');
      const panel = mount(group.prop('panel'));

      expect(panel.find('EuiTabbedContent').prop('tabs')).toHaveLength(2);
      act(() => {
        panel.find('EuiTab#visualization').simulate('click');
      });
      expect(mockVisualization.renderDimensionEditor).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          groupId: 'a',
          accessor: 'newid',
        })
      );
    });

    it('should keep the popover open when configuring a new dimension', () => {
      /**
       * The ID generation system for new dimensions has been messy before, so
       * this tests that the ID used in the first render is used to keep the popover
       * open in future renders
       */
      (generateId as jest.Mock).mockReturnValueOnce(`newid`);
      (generateId as jest.Mock).mockReturnValueOnce(`bad`);
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: [],
            filterOperations: () => true,
            supportsMoreColumns: true,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });
      // Normally the configuration would change in response to a state update,
      // but this test is updating it directly
      mockVisualization.getConfiguration.mockReturnValueOnce({
        groups: [
          {
            groupLabel: 'A',
            groupId: 'a',
            accessors: ['newid'],
            filterOperations: () => true,
            supportsMoreColumns: false,
            dataTestSubj: 'lnsGroup',
          },
        ],
      });

      const component = mountWithIntl(<LayerPanel {...getDefaultProps()} />);

      const group = component.find('DimensionPopover');
      const triggerButton = mountWithIntl(group.prop('trigger'));
      act(() => {
        triggerButton.find('[data-test-subj="lns-empty-dimension"]').first().simulate('click');
      });
      component.update();

      expect(component.find(EuiPopover).prop('isOpen')).toBe(true);
    });
  });
});
