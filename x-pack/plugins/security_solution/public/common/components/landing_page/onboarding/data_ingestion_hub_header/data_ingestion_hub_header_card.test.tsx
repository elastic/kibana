/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DataIngestionHubHeader } from '.';
import { of } from 'rxjs';
import { DataIngestionHubHeaderCard } from './data_ingestion_hub_header_card';
import { HeaderCardAsTypeEnum } from './cards';

const mockGetChromeStyle$ = jest.fn().mockReturnValue(of('https://example.com'));

const mockTrigger = jest.fn();

const cardActionMock = {
  icon: 'mockIcon.png',
  key: 'mockKey',
  title: 'Mock Title',
  description: 'Mock Description',
  asType: HeaderCardAsTypeEnum.action,
  action: {
    title: 'Click Me',
    trigger: mockTrigger,
  },
};

const cardLinkMock = {
  icon: 'mockIcon.png',
  key: 'mockKey2',
  title: 'Mock Title Link',
  description: 'Mock Description Link',
  asType: HeaderCardAsTypeEnum.link,
  link: {
    title: 'Visit Me',
    href: 'https://example.com',
  },
};

const spaceId = 'mockSpaceId';

jest.mock('../../../../lib/kibana', () => {
  const original = jest.requireActual('../../../../lib/kibana');
  return {
    ...original,
    useCurrentUser: jest.fn(),
    useEuiTheme: jest.fn(() => ({ euiTheme: { colorTheme: 'DARK' } })),
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        onboarding: { userSettingsUrl$: mockGetChromeStyle$() },
      },
    }),
  };
});

describe('DataIngestionHubHeaderCardComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the title, description, and icon', () => {
    const { getByTestId, getByText } = render(<DataIngestionHubHeaderCard card={cardActionMock} />);

    expect(getByText('Mock Title')).toBeInTheDocument();
    expect(getByText('Mock Description')).toBeInTheDocument();
    expect(getByTestId('data-ingestion-header-card-icon')).toHaveAttribute('src', 'mockIcon.png');
  });

  it('should render a button when `asType` is `action`', () => {
    const { getByText } = render(<DataIngestionHubHeaderCard card={cardActionMock} />);
    const button = getByText('Click Me');
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(mockTrigger).toHaveBeenCalled();
  });

  it('should render a link when `asType` is `link`', () => {
    const { getByText } = render(<DataIngestionHubHeaderCard card={cardLinkMock} />);
    const link = getByText('Visit Me');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
  });

  it('should apply dark mode styles when color mode is DARK', () => {
    const { container } = render(<DataIngestionHubHeaderCard card={cardActionMock} />);
    const cardElement = container.querySelector('.euiCard');
    expect(cardElement).toHaveStyle('background-color:rgb(255, 255, 255)');
  });

  it('should render the title and description', () => {
    const { queryAllByTestId } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const cards = queryAllByTestId('data-ingestion-header-card');
    cards.forEach((card) => {
      const title = card.querySelector('h3');
      const description = card.querySelector('p');
      expect(title).toBeInTheDocument();
      expect(description).toBeInTheDocument();
    });
  });
});
