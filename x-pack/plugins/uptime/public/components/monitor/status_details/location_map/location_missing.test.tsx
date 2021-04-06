/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithIntl, shallowWithIntl } from '@kbn/test/jest';
import { LocationMissingWarning } from './location_missing';

describe('LocationMissingWarning component', () => {
  it('shallow render correctly against snapshot', () => {
    const component = shallowWithIntl(<LocationMissingWarning />);
    expect(component).toMatchSnapshot();
  });

  it('renders correctly against snapshot', () => {
    const component = renderWithIntl(<LocationMissingWarning />);
    expect(component).toMatchSnapshot();
  });
});
