/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Wrapper } from '../shared/test_wrapper';
import { KubernetesHeaderSection } from './kubernetes_header';

describe('KubernetesHeaderSection', () => {
  it('should render the section for /kubernetes', () => {
    const { getByText } = render(<KubernetesHeaderSection />, {
      wrapper: Wrapper({ location: '/kubernetes' }),
    });
    expect(getByText('Return')).toBeInTheDocument();
    expect(getByText('Setting up Kubernetes with Elastic Agent')).toBeInTheDocument();
    expect(
      getByText(
        'This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host'
      )
    );
  });

  it('renders the secton for /kubernetes queries', () => {
    const { getByText } = render(<KubernetesHeaderSection />, {
      wrapper: Wrapper({ location: '/kubernetes?category=infra' }),
    });
    expect(getByText('Return')).toBeInTheDocument();
    expect(getByText('Setting up Kubernetes with Elastic Agent')).toBeInTheDocument();
    expect(
      getByText(
        'This installation is tailored for configuring and collecting metrics and logs by deploying a new Elastic Agent within your host'
      )
    );
  });
});
