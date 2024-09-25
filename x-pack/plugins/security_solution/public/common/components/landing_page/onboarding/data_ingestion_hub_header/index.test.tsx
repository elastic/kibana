/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { DataIngestionHubHeader } from '.';
import darkRocket from '../images/dark_rocket.png';
import { useCurrentUser } from '../../../../lib/kibana';
import { useHeaderCards } from './cards/header_cards';
import { VideoCard } from './cards/video_card/video_card';

const mockSpace = {
  id: 'space',
  name: 'space',
  disabledFeatures: [],
};

jest.mock('../../../../lib/kibana', () => {
  const original = jest.requireActual('../../../../lib/kibana');

  return {
    useCurrentUser: jest.fn(),
    useEuiTheme: jest.fn(() => ({ colorMode: 'DARK' })),
    useKibana: () => ({
      ...original.useKibana(),
      services: {
        ...original.useKibana().services,
        spaces: {
          getActiveSpace: jest.fn().mockResolvedValue(mockSpace),
        },
      },
    }),
  };
});

jest.mock('./cards/header_cards', () => ({
  useHeaderCards: jest.fn(),
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockUseHeaderCards = useHeaderCards as jest.Mock;

describe('WelcomeHeaderComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHeaderCards.mockReturnValue([]);
  });

  it('should render fullName when fullName is provided', () => {
    const fullName = 'John Doe';
    mockUseCurrentUser.mockReturnValue({ fullName });
    const { getByText } = render(<DataIngestionHubHeader />);
    const titleElement = getByText(`Hi ${fullName}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is an empty string', () => {
    const fullName = '';
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ fullName, username });

    const { getByText } = render(<DataIngestionHubHeader />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is not provided', () => {
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ username });

    const { getByText } = render(<DataIngestionHubHeader />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should not render the greeting message if both fullName and username are not available', () => {
    mockUseCurrentUser.mockReturnValue({});

    const { queryByTestId } = render(<DataIngestionHubHeader />);
    const greetings = queryByTestId('data-ingestion-hub-header-greetings');
    expect(greetings).not.toBeInTheDocument();
  });

  it('should render subtitle', () => {
    const { getByText } = render(<DataIngestionHubHeader />);
    const subtitleElement = getByText('Welcome to Elastic Security');
    expect(subtitleElement).toBeInTheDocument();
  });

  it('should render description', () => {
    const { getByText } = render(<DataIngestionHubHeader />);
    const descriptionElement = getByText('Follow these steps to set up your workspace.');
    expect(descriptionElement).toBeInTheDocument();
  });

  it('should render the rocket dark image when the theme is DARK', () => {
    const { queryByTestId } = render(<DataIngestionHubHeader />);
    const image = queryByTestId('data-ingestion-hub-header-image');
    expect(image).toHaveStyle({ backgroundImage: `url(${darkRocket})` });
  });

  it('should display the modal when the "video" card is clicked', () => {
    mockUseHeaderCards.mockReturnValue([
      <VideoCard
        spaceId="mockSpaceId"
        icon={'mockIcon.png'}
        title={'Video'}
        description={'Video description'}
      />,
    ]);
    const { getByText, queryByTestId } = render(<DataIngestionHubHeader />);

    const cardElement = getByText('Watch video');
    fireEvent.click(cardElement);

    const modalElement = queryByTestId('data-ingestion-hub-video-modal');
    expect(modalElement).toBeInTheDocument();
  });
});
