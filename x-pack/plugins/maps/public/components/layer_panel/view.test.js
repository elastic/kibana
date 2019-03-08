/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./style_tabs', () => ({
  StyleTabs: () => {
    return (<div>mockStyleTabs</div>);
  }
}));

jest.mock('./join_editor', () => ({
  JoinEditor: () => {
    return (<div>mockJoinEditor</div>);
  }
}));

jest.mock('./flyout_footer', () => ({
  FlyoutFooter: () => {
    return (<div>mockFlyoutFooter</div>);
  }
}));

jest.mock('./settings_panel', () => ({
  SettingsPanel: () => {
    return (<div>mockSettingsPanel</div>);
  }
}));

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { LayerPanel } from './view';

const mockLayer = {
  getId: () => { return '1'; },
  getDisplayName: () => { return 'layer 1'; },
  getImmutableSourceProperties: () => {
    return [
      { label: 'source prop1', value: 'you get one chance to set me' }
    ];
  },
  isJoinable: () => { return true; },
  getLayerTypeIconName: () => { return 'vector'; }
};

const defaultProps = {
  selectedLayer: mockLayer,
  hasStateChanged: () => {},
  fitToBounds: () => {},
};

describe('LayerPanel', () => {
  test('is rendered', async () => {
    const component = shallowWithIntl(
      <LayerPanel
        {...defaultProps}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });

  test('should render empty panel when selectedLayer is null', async () => {
    const component = shallowWithIntl(
      <LayerPanel
        {...defaultProps}
        selectedLayer={undefined}
      />
    );

    // Ensure all promises resolve
    await new Promise(resolve => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component)
      .toMatchSnapshot();
  });
});
