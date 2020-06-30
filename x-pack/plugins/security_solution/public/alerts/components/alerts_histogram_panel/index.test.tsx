/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

import { AlertsHistogramPanel } from './index';

jest.mock('react-router-dom', () => {
  const originalModule = jest.requireActual('react-router-dom');
  return {
    ...originalModule,
    createHref: jest.fn(),
    useHistory: jest.fn(),
  };
});

jest.mock('../../../common/lib/kibana');
jest.mock('../../../common/components/navigation/use_get_url_search');

describe('AlertsHistogramPanel', () => {
  it('renders correctly', () => {
    const wrapper = shallow(
      <AlertsHistogramPanel
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
