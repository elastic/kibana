/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import '../../common/mock/match_media';
import { Title } from './title';

describe('Title', () => {
  it('does not render the badge if the release is ga', async () => {
    render(<Title title="Test title" releasePhase="ga" />);

    expect(await screen.findByText('Test title')).toBeInTheDocument();
    expect(screen.queryByText('Beta')).toBeFalsy();
    expect(screen.queryByText('Technical preview')).toBeFalsy();
  });

  it('does render the beta badge', async () => {
    render(<Title title="Test title" releasePhase="beta" />);

    expect(await screen.findByText('Test title')).toBeInTheDocument();
    expect(await screen.findByText('Beta')).toBeInTheDocument();
  });

  it('does render the experimental badge', async () => {
    render(<Title title="Test title" releasePhase="experimental" />);

    expect(await screen.findByText('Test title')).toBeInTheDocument();
    expect(await screen.findByText('Technical preview')).toBeInTheDocument();
  });

  it('renders the title if is not a string', async () => {
    render(<Title title={<span>{'Test title'}</span>} releasePhase="experimental" />);

    expect(await screen.findByText('Test title')).toBeInTheDocument();
    expect(await screen.findByText('Technical preview')).toBeInTheDocument();
  });

  it('renders the children if provided', async () => {
    render(
      <Title title="Test title" releasePhase="ga">
        <span>{'children'}</span>
      </Title>
    );

    expect(await screen.findByText('Test title')).toBeInTheDocument();
    expect(await screen.findByText('children')).toBeInTheDocument();
  });
});
