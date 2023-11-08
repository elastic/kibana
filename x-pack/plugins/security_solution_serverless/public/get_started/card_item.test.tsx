/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { CardItem } from './card_item';

import { QuickStart } from './types';
import type { EuiThemeComputed } from '@elastic/eui';
import { ALL_DONE_TEXT, CREATE_FIRST_PROJECT_TITLE } from './translations';

describe('CardItemComponent', () => {
  const card = {
    id: QuickStart.createFirstProject,
    title: CREATE_FIRST_PROJECT_TITLE,
    allowUndo: false,
    icon: {
      type: 'addDataApp',
    },
    startButton: <>{'Mock Start Button'}</>,
  };
  const mockEuiTheme: EuiThemeComputed = {
    size: {
      l: '16px',
      base: '20px',
    },
    colors: { lightestShade: '' },
  } as EuiThemeComputed;
  const finishedCards = new Set([QuickStart.createFirstProject]);

  it('should render card', () => {
    const { getByText, queryByText } = render(
      <CardItem card={card} euiTheme={mockEuiTheme} finishedCards={finishedCards} />
    );

    const cardTitle = getByText(CREATE_FIRST_PROJECT_TITLE);
    expect(cardTitle).toBeInTheDocument();
  });

  it('show "All done here" if the card has done', () => {
    const { getByText, queryByText } = render(
      <CardItem card={card} euiTheme={mockEuiTheme} finishedCards={finishedCards} />
    );

    const allDone = getByText(ALL_DONE_TEXT);
    expect(allDone).toBeInTheDocument();
    const startButton = queryByText('Mock Start Button');
    expect(startButton).not.toBeInTheDocument();
  });

  it('show "Start" button if the card has not done', () => {
    const { getByText, queryByText } = render(
      <CardItem card={card} euiTheme={mockEuiTheme} finishedCards={finishedCards} />
    );
    const allDone = queryByText(ALL_DONE_TEXT);
    expect(allDone).not.toBeInTheDocument();
    const startButton = getByText('Mock Start Button');
    expect(startButton).toBeInTheDocument();
  });
});
