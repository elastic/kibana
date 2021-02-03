/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '../../../../../lib/helper/rtl_helpers';
import { NoImageAvailable } from './no_image_available';

describe('NoImageAvailable', () => {
  it('renders expected text', () => {
    const { getByText } = render(<NoImageAvailable />);

    expect(getByText('No image available'));
  });
});
