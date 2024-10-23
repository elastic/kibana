/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { EndpointInfo } from './endpoint_info';

describe('RenderEndpoint component tests', () => {
  it('renders the component with inference id', () => {
    render(<EndpointInfo inferenceId={'cohere-2'} />);

    expect(screen.getByText('cohere-2')).toBeInTheDocument();
  });
});
