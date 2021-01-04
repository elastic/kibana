/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallow } from 'enzyme';

jest.mock('../../kibana_services', () => {
  return {
    getMapsCapabilities() {
      return { save: true };
    },
  };
});

// @ts-ignore
import { ToolbarOverlay } from './toolbar_overlay';

test('Must render zoom tools', async () => {
  const component = shallow(<ToolbarOverlay />);
  expect(component).toMatchSnapshot();
});

test('Must zoom tools and draw filter tools', async () => {
  const component = shallow(<ToolbarOverlay addFilters={() => {}} geoFields={['coordinates']} />);
  expect(component).toMatchSnapshot();
});
