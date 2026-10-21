/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSelect,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { formatClock } from '../model/time_format';
import type { PlaybackState } from '../model/player_state';
import {
  BUFFERING_LABEL,
  PAUSE_LABEL,
  PLAY_LABEL,
  REPLAY_LABEL,
  RESTART_LABEL,
  SKIP_IDLE_LABEL,
  SPEED_LABEL,
  formatSpeedOption,
} from '../translations';
import { PLAYBACK_SPEEDS } from './playback_speeds';

export interface PlayerControlsProps {
  playback: PlaybackState;
  offsetMs: number;
  durationMs: number;
  speed: number;
  skipIdle: boolean;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onSpeedChange: (speed: number) => void;
  onSkipIdleChange: (skipIdle: boolean) => void;
}

const SPEED_OPTIONS = PLAYBACK_SPEEDS.map((value) => ({
  value: String(value),
  text: formatSpeedOption(value),
}));

export const PlayerControls = ({
  playback,
  offsetMs,
  durationMs,
  speed,
  skipIdle,
  onPlay,
  onPause,
  onRestart,
  onSpeedChange,
  onSkipIdleChange,
}: PlayerControlsProps) => {
  const { euiTheme } = useEuiTheme();
  const isPlaying = playback === 'playing';
  const isBuffering = playback === 'buffering';
  const isEnded = playback === 'ended';

  const clockStyles = css`
    font-variant-numeric: tabular-nums;
    min-width: ${euiTheme.size.xxxl};
  `;

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap
      data-test-subj="sessionReplayControls"
    >
      <EuiFlexItem grow={false}>
        {isPlaying || isBuffering ? (
          <EuiToolTip content={PAUSE_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType="pause"
              display="fill"
              size="s"
              aria-label={PAUSE_LABEL}
              onClick={onPause}
              data-test-subj="sessionReplayPause"
            />
          </EuiToolTip>
        ) : (
          <EuiToolTip content={isEnded ? REPLAY_LABEL : PLAY_LABEL} disableScreenReaderOutput>
            <EuiButtonIcon
              iconType={isEnded ? 'refresh' : 'play'}
              display="fill"
              size="s"
              aria-label={isEnded ? REPLAY_LABEL : PLAY_LABEL}
              onClick={isEnded ? onRestart : onPlay}
              data-test-subj="sessionReplayPlay"
            />
          </EuiToolTip>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiToolTip content={RESTART_LABEL} disableScreenReaderOutput>
          <EuiButtonIcon
            iconType="return"
            color="text"
            size="s"
            aria-label={RESTART_LABEL}
            onClick={onRestart}
            data-test-subj="sessionReplayRestart"
          />
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" css={clockStyles} data-test-subj="sessionReplayClock">
          {formatClock(offsetMs)} / {formatClock(durationMs)}
        </EuiText>
      </EuiFlexItem>
      {isBuffering && (
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner
            size="m"
            aria-label={BUFFERING_LABEL}
            data-test-subj="sessionReplayBuffering"
          />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow />
      <EuiFlexItem grow={false}>
        <EuiSwitch
          compressed
          label={SKIP_IDLE_LABEL}
          checked={skipIdle}
          onChange={(event) => onSkipIdleChange(event.target.checked)}
          data-test-subj="sessionReplaySkipIdle"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          aria-label={SPEED_LABEL}
          options={SPEED_OPTIONS}
          value={String(speed)}
          onChange={(event) => onSpeedChange(Number(event.target.value))}
          data-test-subj="sessionReplaySpeed"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
