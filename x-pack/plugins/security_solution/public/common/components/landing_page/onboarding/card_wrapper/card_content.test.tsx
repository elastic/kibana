/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CardContent } from './card_content';
import type { Card } from '../types';
import { CardId, SectionId } from '../types';
import { getCardById } from '../sections';

jest.mock('../context/card_context');
jest.mock('../../../../lib/kibana');

describe('CardContent', () => {
  const toggleTaskCompleteStatus = jest.fn();

  const props = {
    indicesExist: false,
    sectionId: SectionId.quickStart,
    card: getCardById(CardId.watchTheOverviewVideo) as Card<CardId>,
    toggleTaskCompleteStatus,
  };

  it('renders card content', () => {
    const { getByTestId, getByText } = render(<CardContent {...props} />);

    const splitPanelElement = getByTestId('split-panel');

    expect(
      getByText(
        'Elastic Security unifies analytics, EDR, cloud security capabilities, and more into a SaaS solution that helps you improve your organization’s security posture, defend against a wide range of threats, and prevent breaches.'
      )
    ).toBeInTheDocument();
    expect(
      getByText('To explore the platform’s core features, watch the video:')
    ).toBeInTheDocument();

    expect(splitPanelElement).toBeInTheDocument();
  });
});
