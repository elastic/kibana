/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('should render the video iframe', () => {
    const videoIframe = screen.getByTitle('Watch overview video');
    expect(videoIframe).toBeInTheDocument();
  });

  // WIP, still working on this test. will unskip before merge
  it.skip('should open the video in a new tab when the iframe is clicked', () => {
    const videoIframe = screen.getByTitle('Watch overview video');
    fireEvent.mouseOver(videoIframe);
    fireEvent.blur(videoIframe);
    expect(window.open).toHaveBeenCalledWith(
      'https://videos.elastic.co/watch/BrDaDBAAvdygvemFKNAkBW',
      '_blank'
    );
  });

  it('should open the video in a new tab when the "Watch overview video" button is clicked', () => {
    const watchVideoButton = screen.getByRole('button', { name: 'Watch overview video' });
    userEvent.click(watchVideoButton);
    expect(window.open).toHaveBeenCalledWith(
      'https://videos.elastic.co/watch/BrDaDBAAvdygvemFKNAkBW',
      '_blank'
    );
  });

  it('should call the onClose callback when the close button is clicked', () => {
    const closeButton = screen.getByTestId('toastCloseButton');
    userEvent.click(closeButton);
    expect(onCloseMock).toHaveBeenCalled();
  });
});
