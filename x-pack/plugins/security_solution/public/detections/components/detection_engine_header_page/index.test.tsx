/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import '../../../common/mock/match_media';
import { DetectionEngineHeaderPage } from './index';

describe('detection_engine_header_page', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<DetectionEngineHeaderPage title="Title" />);

    expect(wrapper.find('[title="Title"]')).toBeTruthy();
  });
});
