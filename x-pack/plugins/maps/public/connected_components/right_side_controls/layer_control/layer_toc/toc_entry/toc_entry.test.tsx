/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { shallow } from 'enzyme';
import { ILayer } from '../../../../../classes/layers/layer';

jest.mock('../../../../../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
  };
});

import { TOCEntry } from './toc_entry';

const LAYER_ID = '1';

const mockLayer = {
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
  supportsFitToBounds: () => {
    return true;
  },
} as unknown as ILayer;

const defaultProps = {
  depth: 0,
  layer: mockLayer,
  selectedLayer: undefined,
  openLayerPanel: async () => {},
  toggleVisible: () => {},
  fitToBounds: () => {},
  getSelectedLayerSelector: () => {},
  hasDirtyStateSelector: false,
  zoom: 0,
  isLegendDetailsOpen: false,
  isReadOnly: false,
  isEditButtonDisabled: false,
  hideTOCDetails: () => {},
  showTOCDetails: () => {},
  isFeatureEditorOpenForLayer: false,
  cancelEditing: () => {},
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

    test('Should indent child layer', async () => {
      const component = shallow(<TOCEntry {...defaultProps} depth={2} />);

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
      const differentLayer = Object.create(mockLayer) as unknown as ILayer;
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
