/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, ChangeEvent, MouseEvent } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { findIndex } from 'lodash';
import { ProcessStartMarker, ProcessEvent } from '../../../common/types/process_tree';
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

  const onLineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
      const line = parseInt((event?.target as HTMLInputElement).value || '0', 10);
      onSeekLine(line);
    },
    [onSeekLine]
  );

  const seekToStart = useCallback(() => {
    onSeekLine(0);
  }, [onSeekLine]);

  const seekToEnd = useCallback(() => {
    onSeekLine(linesLength);
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
              css={styles.controlButton}
              data-test-subj="sessionView:TTYPlayerControlsStart"
              iconType="arrowStart"
              display="empty"
              size="m"
              aria-label={TTY_START}
              onClick={seekToStart}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_PREVIOUS}>
            <EuiButtonIcon
              css={styles.controlButton}
              data-test-subj="sessionView:TTYPlayerControlsPrevious"
              iconType="arrowLeft"
              display="empty"
              size="m"
              aria-label={TTY_PREVIOUS}
              onClick={seekToPrevProcess}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={isPlaying ? TTY_PAUSE : TTY_PLAY}>
            <EuiButtonIcon
              css={styles.controlButton}
              data-test-subj="sessionView:TTYPlayerControlsPlay"
              iconType={isPlaying ? 'pause' : 'playFilled'}
              display="empty"
              size="m"
              aria-label={isPlaying ? TTY_PAUSE : TTY_PLAY}
              onClick={onTogglePlayback}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_NEXT}>
            <EuiButtonIcon
              css={styles.controlButton}
              data-test-subj="sessionView:TTYPlayerControlsNext"
              iconType="arrowRight"
              display="empty"
              size="m"
              aria-label={TTY_NEXT}
              onClick={seekToNextProcess}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={TTY_END}>
            <EuiButtonIcon
              css={styles.controlButton}
              data-test-subj="sessionView:TTYPlayerControlsEnd"
              iconType="arrowEnd"
              display="empty"
              size="m"
              aria-label={TTY_END}
              onClick={seekToEnd}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem style={{ position: 'relative' }}>
          <TTYPlayerControlsMarkers
            processStartMarkers={processStartMarkers}
            linesLength={linesLength}
            currentLine={currentLine}
            onChange={onLineChange}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconSide="right"
            size="s"
            onClick={handleViewInSession}
            iconType="arrowRight"
            aria-label={VIEW_IN_SESSION}
          >
            {VIEW_IN_SESSION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{textSizer}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
