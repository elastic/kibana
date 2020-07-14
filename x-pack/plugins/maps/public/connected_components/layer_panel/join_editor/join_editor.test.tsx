/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ILayer } from '../../../classes/layers/layer';
import { JoinEditor } from './join_editor';
import { shallow } from 'enzyme';
import { JoinDescriptor } from '../../../../common/descriptor_types';

class MockLayer {
  private readonly _disableReason: string | null;

  constructor(disableReason: string | null) {
    this._disableReason = disableReason;
  }

  getJoinsDisabledReason() {
    return this._disableReason;
  }
}

const defaultProps = {
  joins: [
    {
      leftField: 'iso2',
      right: {
        id: '673ff994-fc75-4c67-909b-69fcb0e1060e',
        indexPatternTitle: 'kibana_sample_data_logs',
        term: 'geo.src',
        indexPatternId: 'abcde',
        metrics: [
          {
            type: 'count',
            label: 'web logs count',
          },
        ],
      },
    } as JoinDescriptor,
  ],
  layerDisplayName: 'myLeftJoinField',
  leftJoinFields: [],
  onChange: () => {},
};

test('Should render join editor', () => {
  const component = shallow(
    <JoinEditor {...defaultProps} layer={(new MockLayer(null) as unknown) as ILayer} />
  );
  expect(component).toMatchSnapshot();
});

test('Should render callout when joins are disabled', () => {
  const component = shallow(
    <JoinEditor
      {...defaultProps}
      layer={(new MockLayer('Simulated disabled reason') as unknown) as ILayer}
    />
  );
  expect(component).toMatchSnapshot();
});
