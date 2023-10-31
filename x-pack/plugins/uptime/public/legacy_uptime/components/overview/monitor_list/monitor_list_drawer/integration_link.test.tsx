/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { IntegrationLink } from './actions_popover/integration_link';
import { shallowWithIntl } from '@kbn/test-jest-helpers';

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
  it('renders a disabled link when href is undefined', () => {
    const component = shallowWithIntl(
      <IntegrationLink
        ariaLabel="foo"
        href={undefined}
        iconType="apmApp"
        message="click for bar"
        tooltipContent="info for bar"
      />
    );
    expect(component).toMatchSnapshot();
  });
});
