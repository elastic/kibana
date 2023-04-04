/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import React from 'react';
import { DimensionTrigger } from '.';

describe('DimensionTrigger', () => {
  it('should fallback to the empty title if the dimension label is made of an empty string', () => {
    render(<DimensionTrigger id="dimensionEmpty" label="" />);
    expect(screen.queryByText('[No title]')).toBeInTheDocument();
  });

  it('should fallback to the empty title if the dimension label is made up of whitespaces only', () => {
    render(<DimensionTrigger id="dimensionEmpty" label="     " />);
    expect(screen.queryByText('[No title]')).toBeInTheDocument();
  });

  it('should not fallback to the empty title if the dimension label has also valid chars beside whitespaces', () => {
    render(<DimensionTrigger id="dimensionEmpty" label="aaa     " />);
    expect(screen.queryByText('aaa')).toBeInTheDocument();
  });
});
