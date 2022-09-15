/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../../../kibana_services', () => ({}));

jest.mock('./load_index_settings', () => ({
  loadIndexSettings: async () => {
    return { maxInnerResultWindow: 100, maxResultWindow: 10000 };
  },
}));

import React from 'react';
import { shallow } from 'enzyme';

import { ScalingForm } from './scaling_form';
import { SCALING_TYPES } from '../../../../../common/constants';

const defaultProps = {
  filterByMapBounds: true,
  indexPatternId: 'myIndexPattern',
  onChange: () => {},
  scalingType: SCALING_TYPES.LIMIT,
  supportsClustering: true,
  termFields: [],
  numberOfJoins: 0,
};

describe('scaling form', () => {
  test('should render', async () => {
    const component = shallow(<ScalingForm {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  test('should disable clusters option when clustering is not supported', async () => {
    const component = shallow(
      <ScalingForm
        {...defaultProps}
        supportsClustering={false}
        clusteringDisabledReason="Simulated clustering disabled"
      />
    );

    expect(component).toMatchSnapshot();
  });
});
