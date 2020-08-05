/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import React from 'react';

import '../../../../common/mock/match_media';
import { LineToolTipContentComponent } from './line_tool_tip_content';
import {
  SUM_OF_CLIENT_BYTES,
  SUM_OF_DESTINATION_BYTES,
  SUM_OF_SERVER_BYTES,
  SUM_OF_SOURCE_BYTES,
} from '../map_config';
import {
  ITooltipProperty,
  TooltipProperty,
} from '../../../../../../maps/public/classes/tooltips/tooltip_property';

describe('LineToolTipContent', () => {
  const mockFeatureProps: ITooltipProperty[] = [
    new TooltipProperty(SUM_OF_DESTINATION_BYTES, SUM_OF_DESTINATION_BYTES, 'testPropValue'),
    new TooltipProperty(SUM_OF_SOURCE_BYTES, SUM_OF_SOURCE_BYTES, 'testPropValue'),
  ];

  const mockClientServerFeatureProps: ITooltipProperty[] = [
    new TooltipProperty(SUM_OF_SERVER_BYTES, SUM_OF_SERVER_BYTES, 'testPropValue'),
    new TooltipProperty(SUM_OF_CLIENT_BYTES, SUM_OF_CLIENT_BYTES, 'testPropValue'),
  ];

  test('renders correctly against snapshot', () => {
    const wrapper = shallow(
      <LineToolTipContentComponent contextId={'contextId'} featureProps={mockFeatureProps} />
    );
    expect(wrapper).toMatchSnapshot();
  });

  test('renders correctly against snapshot when rendering client & server', () => {
    const wrapper = shallow(
      <LineToolTipContentComponent
        contextId={'contextId'}
        featureProps={mockClientServerFeatureProps}
      />
    );
    expect(wrapper).toMatchSnapshot();
  });
});
