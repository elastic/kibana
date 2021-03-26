/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from './rtl_helpers';
import { ExploratoryView } from './exploratory_view';

describe('ExploratoryView', () => {
  it('renders a label for button', async () => {
    const wrapper = render(<ExploratoryView />);

    expect(wrapper).toMatchSnapshot();
  });
});
