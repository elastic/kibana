/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./toc_entry', () => ({
  TOCEntry: () => {
    return <div>mockTOCEntry</div>;
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { LayerTOC } from './view';

const mockLayers = [
  {
    getId: () => {
      return '1';
    },
    supportsFitToBounds: () => {
      return true;
    },
  },
  {
    getId: () => {
      return '2';
    },
    supportsFitToBounds: () => {
      return false;
    },
  },
];

describe('LayerTOC', () => {
  test('is rendered', () => {
    const component = shallow(<LayerTOC layerList={mockLayers} />);

    expect(component).toMatchSnapshot();
  });

  describe('props', () => {
    test('isReadOnly', () => {
      const component = shallow(<LayerTOC layerList={mockLayers} isReadOnly={true} />);

      expect(component).toMatchSnapshot();
    });
  });
});
