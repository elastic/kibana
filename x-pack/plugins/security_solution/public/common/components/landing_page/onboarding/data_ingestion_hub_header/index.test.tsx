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
import { HeaderCardAsTypeEnum, useDataIngestionHubHeaderCards } from './cards';

jest.mock('../../../../lib/kibana', () => ({
  useCurrentUser: jest.fn(),
  useEuiTheme: jest.fn(() => ({ colorMode: 'DARK' })),
}));

jest.mock('./cards', () => ({
  useDataIngestionHubHeaderCards: jest.fn(),
  HeaderCardAsTypeEnum: {
    action: 'action',
  },
}));

const mockUseCurrentUser = useCurrentUser as jest.Mock;
const mockUseDataIngestionHubHeaderCards = useDataIngestionHubHeaderCards as jest.Mock;

const spaceId = 'mockSpaceId';

describe('WelcomeHeaderComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDataIngestionHubHeaderCards.mockReturnValue([]); // Return an empty array by default
  });

  it('should render fullName when fullName is provided', () => {
    const fullName = 'John Doe';
    mockUseCurrentUser.mockReturnValue({ fullName });
    const { getByText } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const titleElement = getByText(`Hi ${fullName}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is an empty string', () => {
    const fullName = '';
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ fullName, username });

    const { getByText } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should render username when fullName is not provided', () => {
    const username = 'jd';
    mockUseCurrentUser.mockReturnValue({ username });

    const { getByText } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const titleElement = getByText(`Hi ${username}!`);
    expect(titleElement).toBeInTheDocument();
  });

  it('should not render the greeting message if both fullName and username are not available', () => {
    mockUseCurrentUser.mockReturnValue({});

    const { queryByTestId } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const greetings = queryByTestId('data-ingestion-hub-header-greetings');
    expect(greetings).not.toBeInTheDocument();
  });

  it('should render subtitle', () => {
    const { getByText } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const subtitleElement = getByText('Welcome to Elastic Security');
    expect(subtitleElement).toBeInTheDocument();
  });

  it('should render description', () => {
    const { getByText } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const descriptionElement = getByText('Follow these steps to set up your workspace.');
    expect(descriptionElement).toBeInTheDocument();
  });

  it('should render the rocket dark image when the theme is DARK', () => {
    const { queryByTestId } = render(<DataIngestionHubHeader spaceId={spaceId} />);
    const image = queryByTestId('data-ingestion-hub-header-image');
    expect(image).toHaveStyle({ backgroundImage: `url(${darkRocket})` });
  });

  it('should display the modal when the "video" card is clicked', () => {
    const mockVideoAction = jest.fn();
    mockUseDataIngestionHubHeaderCards.mockReturnValue([
      {
        key: 'video',
        title: 'Video',
        description: 'Watch our video',
        icon: darkRocket,
        asType: HeaderCardAsTypeEnum.action,
        action: { title: 'Watch', trigger: mockVideoAction },
      },
    ]);

    const { getByText, queryByTestId } = render(<DataIngestionHubHeader spaceId={spaceId} />);

    const cardElement = getByText('Watch');
    fireEvent.click(cardElement);
    expect(mockVideoAction).toHaveBeenCalled();
  });
});
