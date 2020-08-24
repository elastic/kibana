/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable max-classes-per-file */

import React from 'react';
import { shallow } from 'enzyme';
import { AbstractLayer, ILayer } from '../../../../../../classes/layers/layer';
import { AbstractSource, ISource } from '../../../../../../classes/sources/source';
import { IStyle } from '../../../../../../classes/styles/style';

import { TOCEntryActionsPopover } from './toc_entry_actions_popover';

let supportsFitToBounds: boolean;

class MockSource extends AbstractSource implements ISource {}

class MockStyle implements IStyle {
  renderEditor() {
    return null;
  }

  getType() {
    return 'mockStyle';
  }
}

class LayerMock extends AbstractLayer implements ILayer {
  constructor() {
    const sourceDescriptor = {
      type: 'mySourceType',
    };
    const source = new MockSource(sourceDescriptor);
    const style = new MockStyle();
    const layerDescriptor = {
      id: 'testLayer',
      sourceDescriptor,
    };
    super({ layerDescriptor, source, style });
  }

  async supportsFitToBounds(): Promise<boolean> {
    return supportsFitToBounds;
  }

  isVisible() {
    return true;
  }

  getIconAndTooltipContent(zoom: number, isUsingSearch: boolean) {
    return {
      icon: <span>mockIcon</span>,
      tooltipContent: `simulated tooltip content at zoom: ${zoom}`,
      footnotes: [
        {
          icon: <span>mockFootnoteIcon</span>,
          message: `simulated footnote at isUsingSearch: ${isUsingSearch}`,
        },
      ],
    };
  }
}

const defaultProps = {
  cloneLayer: () => {},
  displayName: 'layer 1',
  editLayer: () => {},
  escapedDisplayName: 'layer1',
  fitToBounds: () => {},
  isEditButtonDisabled: false,
  isReadOnly: false,
  isUsingSearch: true,
  layer: new LayerMock(),
  removeLayer: () => {},
  toggleVisible: () => {},
  zoom: 0,
};

describe('TOCEntryActionsPopover', () => {
  beforeEach(() => {
    supportsFitToBounds = true;
  });

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
    supportsFitToBounds = false;
    const component = shallow(<TOCEntryActionsPopover {...defaultProps} />);

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
