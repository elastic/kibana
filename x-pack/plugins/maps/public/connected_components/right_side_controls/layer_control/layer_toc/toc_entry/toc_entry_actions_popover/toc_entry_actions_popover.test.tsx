/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import React from 'react';
import { shallow } from 'enzyme';
import { AbstractLayer, ILayer } from '../../../../../../classes/layers/layer';
import { AbstractSource, ISource } from '../../../../../../classes/sources/source';

import { TOCEntryActionsPopover } from './toc_entry_actions_popover';

class MockSource extends AbstractSource implements ISource {}

class LayerMock extends AbstractLayer implements ILayer {
  constructor() {
    const sourceDescriptor = {
      type: 'mySourceType',
    };
    const source = new MockSource(sourceDescriptor);
    const layerDescriptor = {
      id: 'testLayer',
      sourceDescriptor,
    };
    super({ layerDescriptor, source });
  }

  isVisible() {
    return true;
  }
}

const defaultProps = {
  cloneLayer: () => {},
  displayName: 'layer 1',
  escapedDisplayName: 'layer1',
  fitToBounds: () => {},
  isEditButtonDisabled: false,
  isReadOnly: false,
  layer: new LayerMock(),
  removeLayer: () => {},
  toggleVisible: () => {},
  supportsFitToBounds: true,
  enableShapeEditing: () => {},
  enablePointEditing: () => {},
  openLayerSettings: () => {},
};

describe('TOCEntryActionsPopover', () => {
  test('is rendered', async () => {
    const component = shallow(<TOCEntryActionsPopover {...defaultProps} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should not show edit actions in read only mode', async () => {
    const component = shallow(<TOCEntryActionsPopover {...defaultProps} isReadOnly={true} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should disable fit to data when supportsFitToBounds is false', async () => {
    const component = shallow(
      <TOCEntryActionsPopover {...defaultProps} supportsFitToBounds={false} />
    );

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  test('should have "show layer" action when layer is not visible', async () => {
    const layer = new LayerMock();
    layer.isVisible = () => {
      return false;
    };
    const component = shallow(<TOCEntryActionsPopover {...defaultProps} layer={layer} />);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });
});
