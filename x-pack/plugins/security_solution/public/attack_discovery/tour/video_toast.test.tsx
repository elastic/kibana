/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoToast } from './video_toast';

describe('VideoToast', () => {
  const onCloseMock = jest.fn();
  beforeEach(() => {
    jest.spyOn(window, 'open').mockImplementation(() => null);
    render(<VideoToast onClose={onCloseMock} />);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('should render the video toast', () => {
    const videoToast = screen.getByTestId('attackDiscovery-tour-step-2');
    expect(videoToast).toBeInTheDocument();
  });

  it('should render the video gif', () => {
    const videoGif = screen.getByTestId('video-gif');
    expect(videoGif).toBeInTheDocument();
  });

  it('should open the video in a new tab when the gif is clicked', async () => {
    const videoGif = screen.getByTestId('video-gif');
    await userEvent.click(videoGif);
    expect(window.open).toHaveBeenCalledWith(
      'https://videos.elastic.co/watch/BrDaDBAAvdygvemFKNAkBW',
      '_blank'
    );
  });

  it('should open the video in a new tab when the "Watch overview video" button is clicked', async () => {
    const watchVideoButton = screen.getByRole('button', { name: 'Watch overview video' });
    await userEvent.click(watchVideoButton);
    expect(window.open).toHaveBeenCalledWith(
      'https://videos.elastic.co/watch/BrDaDBAAvdygvemFKNAkBW',
      '_blank'
    );
  });

  it('should call the onClose callback when the close button is clicked', async () => {
    const closeButton = screen.getByTestId('toastCloseButton');
    await userEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
