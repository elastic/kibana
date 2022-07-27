/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallowWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { LocationLink } from './location_link';

describe('LocationLink component', () => {
  it('renders the location when present', () => {
    const component = shallowWithIntl(<LocationLink location="us-east-1" />);
    expect(component).toMatchSnapshot();
  });

  it('renders a help link when location not present', () => {
    const component = shallowWithIntl(<LocationLink />);
    expect(component).toMatchSnapshot();
  });
});
