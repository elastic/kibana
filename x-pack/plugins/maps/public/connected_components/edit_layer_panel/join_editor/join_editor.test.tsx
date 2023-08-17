/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IVectorLayer } from '../../../classes/layers/vector_layer';
import { JoinEditor } from './join_editor';
import { shallow } from 'enzyme';
import { JoinDescriptor } from '../../../../common/descriptor_types';
import { SOURCE_TYPES } from '../../../../common/constants';

class MockLayer {
  getSource() {
    return {
      isMvt: () => {
        return false;
      },
    };
  }
}

const defaultProps = {
  joins: [
    {
      leftField: 'iso2',
      right: {
        id: '673ff994-fc75-4c67-909b-69fcb0e1060e',
        term: 'geo.src',
        indexPatternId: 'abcde',
        metrics: [
          {
            type: 'count',
            label: 'web logs count',
          },
        ],
        type: SOURCE_TYPES.ES_TERM_SOURCE,
      },
    } as JoinDescriptor,
  ],
  layerDisplayName: 'myLeftJoinField',
  leftJoinFields: [],
  onChange: () => {},
};

test('Should render join editor', () => {
  const component = shallow(
    <JoinEditor {...defaultProps} layer={new MockLayer() as unknown as IVectorLayer} />
  );
  expect(component).toMatchSnapshot();
});
