/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlayerControls } from './player_controls';
import type { PlayerControlsProps } from './player_controls';

const renderControls = (props: Partial<PlayerControlsProps> = {}) => {
  const handlers = {
    onPlay: jest.fn(),
    onPause: jest.fn(),
    onRestart: jest.fn(),
    onSpeedChange: jest.fn(),
    onSkipIdleChange: jest.fn(),
  };
  render(
    <PlayerControls
      playback="paused"
      offsetMs={65_000}
      durationMs={125_000}
      speed={1}
      skipIdle={false}
      {...handlers}
      {...props}
    />
  );
  return handlers;
};

describe('PlayerControls', () => {
  it('shows the position and the duration', () => {
    renderControls();

    expect(screen.getByTestId('sessionReplayClock')).toHaveTextContent('1:05 / 2:05');
  });

  it('plays when paused', () => {
    const { onPlay } = renderControls();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it.each(['playing', 'buffering'] as const)('pauses while %s', (playback) => {
    const { onPause } = renderControls({ playback });

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));

    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('offers a replay from the start once ended', () => {
    const { onRestart, onPlay } = renderControls({ playback: 'ended' });

    fireEvent.click(screen.getByRole('button', { name: 'Replay from the start' }));

    expect(onRestart).toHaveBeenCalledTimes(1);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it('restarts', () => {
    const { onRestart } = renderControls();

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  it('changes the speed', () => {
    const { onSpeedChange } = renderControls();

    fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), {
      target: { value: '4' },
    });

    expect(onSpeedChange).toHaveBeenCalledWith(4);
  });

  it('toggles idle skipping', () => {
    const { onSkipIdleChange } = renderControls();

    fireEvent.click(screen.getByTestId('sessionReplaySkipIdle'));

    expect(onSkipIdleChange).toHaveBeenCalledWith(true);
  });

  it('shows a busy indicator only while buffering', () => {
    renderControls({ playback: 'buffering' });
    expect(screen.getByTestId('sessionReplayBuffering')).toBeInTheDocument();
  });

  it('shows no busy indicator otherwise', () => {
    renderControls({ playback: 'playing' });
    expect(screen.queryByTestId('sessionReplayBuffering')).not.toBeInTheDocument();
  });
});
