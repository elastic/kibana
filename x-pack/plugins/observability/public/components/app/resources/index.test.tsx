/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { render } from '@testing-library/react';
import React from 'react';
import { Resources } from './';

describe('Resources', () => {
  it('renders resources with all elements', () => {
    const { getByText } = render(<Resources />);
    expect(getByText('Documentation')).toBeInTheDocument();
    expect(getByText('Discuss forum')).toBeInTheDocument();
    expect(getByText('Training and webinars')).toBeInTheDocument();
  });
  it('expects all links to be defined', () => {
    const { getByTestId } = render(<Resources />);
    const validateLink = (testId: string) => {
      const href = (getByTestId(testId) as HTMLAnchorElement).href;
      expect(href).not.toEqual('');
      expect(href).not.toEqual('https://www.elastic.co/');
    };

    validateLink('button-documentation');
    validateLink('button-forum');
    validateLink('button-training');
  });
});
