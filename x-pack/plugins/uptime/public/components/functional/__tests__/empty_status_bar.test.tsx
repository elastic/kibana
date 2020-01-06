/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { shallowWithIntl } from 'test_utils/enzyme_helpers';
import { EmptyStatusBar } from '../empty_status_bar';

describe('EmptyStatusBar component', () => {
  it('renders a message when provided', () => {
    const component = shallowWithIntl(<EmptyStatusBar message="foobarbaz" monitorId="mon_id" />);
    expect(component).toMatchSnapshot();
  });

  it('renders a default message when no message provided', () => {
    const component = shallowWithIntl(<EmptyStatusBar monitorId="mon_id" />);
    expect(component).toMatchSnapshot();
  });
});
