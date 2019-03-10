/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('./layer_toc', () => ({
  LayerTOC: () => {
    return (<div>mockLayerTOC</div>);
  }
}));

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

import { LayerControl } from './view';

const defaultProps = {
  showAddLayerWizard: () => {}
};

describe('LayerControl', () => {
  test('is rendered', () => {
    const component = shallowWithIntl(
      <LayerControl
        {...defaultProps}
      />
    );

    expect(component)
      .toMatchSnapshot();
  });

  describe('props', () => {
    test('isReadOnly', () => {
      const component = shallowWithIntl(
        <LayerControl
          {...defaultProps}
          isReadOnly={true}
        />
      );

      expect(component)
        .toMatchSnapshot();
    });
  });
});
