/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { TOCEntry } from './view';

const mockLayer = {
  getId: () => { return '1'; },
  getTOCDetails: () => { return (<div>TOC details mock</div>); },
  getDisplayName: () => { return 'layer 1'; },
  isVisible: () => { return true; },
  showAtZoomLevel: () => { return true; },
  hasErrors: () => { return false; },
};

const defaultProps = {
  layer: mockLayer,
  openLayerPanel: () => {},
  toggleVisible: () => {},
  fitToBounds: () => {},
  getSelectedLayerSelector: () => {},
  hasDirtyStateSelector: () => {},
  zoom: 0,
};

describe('TOCEntry', () => {
  test('is rendered', async () => {
    const component = shallowWithIntl(
      <TOCEntry
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

  describe('props', () => {
    test('isReadOnly', async () => {
      const component = shallowWithIntl(
        <TOCEntry
          {...defaultProps}
          isReadOnly={true}
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
});
