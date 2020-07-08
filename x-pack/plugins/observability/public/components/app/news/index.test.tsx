/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render } from '../../../utils/test_helper';
import { News } from './';

describe('News', () => {
  it('renders resources with all elements', () => {
    const { getByText, getAllByText } = render(<News />);
    expect(getByText("What's new")).toBeInTheDocument();
    expect(getAllByText('Read full story')).not.toEqual([]);
  });
});
