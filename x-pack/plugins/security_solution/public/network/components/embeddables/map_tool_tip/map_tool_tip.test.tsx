/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import React from 'react';
import '../../../../common/mock/match_media';
import { MapToolTipComponent } from './map_tool_tip';
import { TooltipFeature } from '@kbn/maps-plugin/common';

describe('MapToolTip', () => {
  test('placeholder component renders correctly against snapshot', () => {
    const wrapper = shallow(<MapToolTipComponent />);
    expect(wrapper).toMatchSnapshot();
  });

  test('full component renders correctly against snapshot', () => {
    const addFilters = jest.fn();
    const closeTooltip = jest.fn();
    const features: TooltipFeature[] = [
      {
        id: 1,
        layerId: 'layerId',
        mbProperties: {},
        actions: [],
      },
    ];
    const getLayerName = jest.fn();
    const loadFeatureProperties = jest.fn();
    const loadFeatureGeometry = jest.fn();

    const wrapper = shallow(
      <MapToolTipComponent
        addFilters={addFilters}
        closeTooltip={closeTooltip}
        features={features}
        isLocked={false}
        getLayerName={getLayerName}
        loadFeatureProperties={loadFeatureProperties}
        loadFeatureGeometry={loadFeatureGeometry}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
