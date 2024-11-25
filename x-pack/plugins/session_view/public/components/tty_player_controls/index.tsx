/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
  EuiButtonIconProps,
  EuiRangeProps,
} from '@elastic/eui';
import { findIndex } from 'lodash';
import type { ProcessStartMarker, ProcessEvent } from '../../../common';
import { useStyles } from './styles';
import {
  TTY_END,
  TTY_NEXT,
  TTY_PAUSE,
  TTY_PLAY,
  TTY_PREVIOUS,
  TTY_START,
  VIEW_IN_SESSION,
} from './translations';
import { TTYPlayerControlsMarkers } from './tty_player_controls_markers';

export interface TTYPlayerControlsDeps {
  currentProcessEvent: ProcessEvent | undefined;
  processStartMarkers: ProcessStartMarker[];
  isPlaying: boolean;
  currentLine: number;
  linesLength: number;
  onSeekLine(line: number): void;
  onTogglePlayback(): void;
  onClose(): void;
  onJumpToEvent(event: ProcessEvent): void;
  textSizer: JSX.Element;
}

export const TTYPlayerControls = ({
  currentProcessEvent,
  processStartMarkers,
  isPlaying,
  currentLine,
  linesLength,
  onSeekLine,
  onTogglePlayback,
  onClose,
  onJumpToEvent,
  textSizer,
}: TTYPlayerControlsDeps) => {
  const styles = useStyles();

  const commonButtonProps: Partial<EuiButtonIconProps> = {
    display: 'empty',
    size: 's',
    color: 'text',
    css: styles.controlButton,
  };

  const onLineChange = useCallback<NonNullable<EuiRangeProps['onChange']>>(
    (event) => {
      const line = parseInt(event.currentTarget.value || '0', 10);
      onSeekLine(line);
    },
    [onSeekLine]
  );

  const seekToStart = useCallback(() => {
    onSeekLine(0);
  }, [onSeekLine]);

  const seekToEnd = useCallback(() => {
    onSeekLine(linesLength - 1);
  }, [linesLength, onSeekLine]);

  const seekToPrevProcess = useCallback(() => {
    const index =
      currentLine > processStartMarkers[processStartMarkers.length - 1].line
        ? processStartMarkers.length
        : findIndex(processStartMarkers, (marker) => marker.line >= currentLine);

    const previousMarker = processStartMarkers[index - 1];
    onSeekLine(previousMarker?.line || 0);
  }, [processStartMarkers, onSeekLine, currentLine]);

  const seekToNextProcess = useCallback(() => {
    const nextIndex = findIndex(processStartMarkers, (marker) => {
      if (marker.line > currentLine) {
        return true;
      }

      return false;
    });

    const nextMarker = processStartMarkers[nextIndex];
    onSeekLine(nextMarker?.line || linesLength - 1);
  }, [processStartMarkers, onSeekLine, linesLength, currentLine]);

  const handleViewInSession = useCallback(() => {
    if (currentProcessEvent) {
      onJumpToEvent(currentProcessEvent);
      onClose();
    }
  }, [currentProcessEvent, onClose, onJumpToEvent]);

  return (
    <EuiPanel
      css={styles.controlsPanel}
      data-test-subj="sessionView:TTYPlayerControls"
      hasShadow={false}
      borderRadius="none"
    >
      <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_START}>
            <EuiButtonIcon
              data-test-subj="sessionView:TTYPlayerControlsStart"
              iconType="arrowStart"
              aria-label={TTY_START}
              onClick={seekToStart}
              {...commonButtonProps}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_PREVIOUS}>
            <EuiButtonIcon
              data-test-subj="sessionView:TTYPlayerControlsPrevious"
              iconType="arrowLeft"
              aria-label={TTY_PREVIOUS}
              onClick={seekToPrevProcess}
              {...commonButtonProps}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={isPlaying ? TTY_PAUSE : TTY_PLAY}>
            <EuiButtonIcon
              data-test-subj="sessionView:TTYPlayerControlsPlay"
              iconType={isPlaying ? 'pause' : 'playFilled'}
              aria-label={isPlaying ? TTY_PAUSE : TTY_PLAY}
              onClick={onTogglePlayback}
              {...commonButtonProps}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_NEXT}>
            <EuiButtonIcon
              data-test-subj="sessionView:TTYPlayerControlsNext"
              iconType="arrowRight"
              aria-label={TTY_NEXT}
              onClick={seekToNextProcess}
              {...commonButtonProps}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_END}>
            <EuiButtonIcon
              data-test-subj="sessionView:TTYPlayerControlsEnd"
              iconType="arrowEnd"
              aria-label={TTY_END}
              onClick={seekToEnd}
              {...commonButtonProps}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem style={{ position: 'relative' }}>
          <TTYPlayerControlsMarkers
            processStartMarkers={processStartMarkers}
            linesLength={linesLength}
            currentLine={currentLine}
            onChange={onLineChange}
            onSeekLine={onSeekLine}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconSide="right"
            size="s"
            onClick={handleViewInSession}
            iconType="arrowRight"
            aria-label={VIEW_IN_SESSION}
            color="text"
          >
            {VIEW_IN_SESSION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{textSizer}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
