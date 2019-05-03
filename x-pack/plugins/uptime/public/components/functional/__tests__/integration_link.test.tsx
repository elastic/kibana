/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { IntegrationLink } from '../integration_link';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';

describe('IntegrationLink component', () => {
  it('renders without errors', () => {
    const component = shallowWithIntl(
      <IntegrationLink
        ariaLabel="foo"
        href="/app/foo?kuery=localhost"
        iconType="apmApp"
        message="click for bar"
        tooltipContent="info for bar"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
