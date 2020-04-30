/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { SignalsHistogramPanel } from './index';

jest.mock('../../../../lib/kibana');
jest.mock('../../../../components/navigation/use_get_url_search');

describe('SignalsHistogramPanel', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <SignalsHistogramPanel
        from={0}
        signalIndexName="signalIndexName"
        setQuery={jest.fn()}
        to={1}
        updateDateRange={jest.fn()}
      />
    );

    expect(wrapper.find('[id="detections-histogram"]')).toBeTruthy();
  });
});
