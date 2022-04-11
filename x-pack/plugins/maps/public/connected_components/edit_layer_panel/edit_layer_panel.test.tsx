/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./style_settings', () => ({
  StyleSettings: () => {
    return <div>mockStyleSettings</div>;
  },
}));

jest.mock('./join_editor', () => ({
  JoinEditor: () => {
    return <div>mockJoinEditor</div>;
  },
}));

jest.mock('./filter_editor', () => ({
  JoinEditor: () => {
    return <div>mockFilterEditor</div>;
  },
}));

jest.mock('./flyout_footer', () => ({
  FlyoutFooter: () => {
    return <div>mockFlyoutFooter</div>;
  },
}));

jest.mock('./layer_settings', () => ({
  LayerSettings: () => {
    return <div>mockLayerSettings</div>;
  },
}));

jest.mock('../../kibana_services', () => {
  return {
    getData() {
      return {};
    },
    getCore() {
      return {};
    },
  };
});

import React from 'react';
import { shallow } from 'enzyme';
import { LAYER_TYPE } from '../../../common/constants';
import { ILayer } from '../../classes/layers/layer';
import { EditLayerPanel } from './edit_layer_panel';

const mockLayer = {
  getId: () => {
    return '1';
  },
  getType: () => {
    return LAYER_TYPE.GEOJSON_VECTOR;
  },
  getDisplayName: () => {
    return 'layer 1';
  },
  getImmutableSourceProperties: () => {
    return [{ label: 'source prop1', value: 'you get one chance to set me' }];
  },
  showJoinEditor: () => {
    return true;
  },
  canShowTooltip: () => {
    return true;
  },
  supportsElasticsearchFilters: () => {
    return false;
  },
  getLayerTypeIconName: () => {
    return 'vector';
  },
  renderSourceSettingsEditor: () => {
    return <div>mockSourceSettings</div>;
  },
  hasErrors: () => {
    return false;
  },
  hasJoins: () => {
    return false;
  },
  supportsFitToBounds: () => {
    return true;
  },
} as unknown as ILayer;

const defaultProps = {
  selectedLayer: mockLayer,
  fitToBounds: () => {},
  updateSourceProps: async () => {},
};

describe('EditLayerPanel', () => {
  test('is rendered', async () => {
    const component = shallow(<EditLayerPanel {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should render empty panel when selectedLayer is null', async () => {
    const component = shallow(<EditLayerPanel {...defaultProps} selectedLayer={undefined} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
