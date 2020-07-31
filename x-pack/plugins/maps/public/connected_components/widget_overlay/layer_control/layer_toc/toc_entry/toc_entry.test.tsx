/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { TOCEntry } from './toc_entry';
import { ILayer } from '../../../../../classes/layers/layer';

const LAYER_ID = '1';

const mockLayer = ({
  getId: () => {
    return LAYER_ID;
  },
  renderLegendDetails: () => {
    return <div>TOC details mock</div>;
  },
  getDisplayName: () => {
    return 'layer 1';
  },
  isPreviewLayer: () => {
    return false;
  },
  isVisible: () => {
    return true;
  },
  showAtZoomLevel: () => {
    return true;
  },
  hasErrors: () => {
    return false;
  },
  hasLegendDetails: () => {
    return true;
  },
} as unknown) as ILayer;

const defaultProps = {
  layer: mockLayer,
  dragHandleProps: {},
  isDragging: false,
  isDraggingOver: false,
  isReadOnly: false,
  openLayerPanel: () => {},
  cloneLayer: () => {},
  hideTOCDetails: () => {},
  showTOCDetails: () => {},
  hasDirtyState: false,
  zoom: 0,
  isLegendDetailsOpen: false,
  areOpenPanelButtonsDisabled: false,
};

describe('TOCEntry', () => {
  test('is rendered', async () => {
    const component = shallow(<TOCEntry {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('isReadOnly', async () => {
      const component = shallow(<TOCEntry {...defaultProps} isReadOnly={true} />);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('should display layer details when isLegendDetailsOpen is true', async () => {
      const component = shallow(<TOCEntry {...defaultProps} isLegendDetailsOpen={true} />);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should shade background when selected layer', async () => {
      const component = shallow(<TOCEntry {...defaultProps} selectedLayer={mockLayer} />);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });

    test('Should shade background when not selected layer', async () => {
      const differentLayer = Object.create(mockLayer);
      differentLayer.getId = () => {
        return 'foobar';
      };
      const component = shallow(<TOCEntry {...defaultProps} selectedLayer={differentLayer} />);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      expect(component).toMatchSnapshot();
    });
  });
});
