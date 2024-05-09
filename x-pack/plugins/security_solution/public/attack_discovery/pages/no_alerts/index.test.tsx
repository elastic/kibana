/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { NoAlerts } from '.';
import { ATTACK_DISCOVERY_ONLY, LEARN_MORE, NO_ALERTS_TO_ANALYZE } from './translations';

describe('NoAlerts', () => {
  beforeEach(() => {
    render(<NoAlerts />);
  });

  it('renders the avatar', () => {
    const avatar = screen.getByTestId('emptyPromptAvatar');

    expect(avatar).toBeInTheDocument();
  });

  it('renders the expected title', () => {
    const title = screen.getByTestId('noAlertsTitle');

    expect(title).toHaveTextContent(NO_ALERTS_TO_ANALYZE);
  });

  it('renders the expected body text', () => {
    const bodyText = screen.getByTestId('bodyText');

    expect(bodyText).toHaveTextContent(ATTACK_DISCOVERY_ONLY);
  });

  describe('link', () => {
    let learnMoreLink: HTMLElement;

    beforeEach(() => {
      learnMoreLink = screen.getByTestId('learnMoreLink');
    });

    it('links to the documentation', () => {
      expect(learnMoreLink).toHaveAttribute(
        'href',
        'https://www.elastic.co/guide/en/security/current/attack-discovery.html'
      );
    });

    it('opens in a new tab', () => {
      expect(learnMoreLink).toHaveAttribute('target', '_blank');
    });

    it('has the expected text', () => {
      expect(learnMoreLink).toHaveTextContent(LEARN_MORE);
    });
  });
});
