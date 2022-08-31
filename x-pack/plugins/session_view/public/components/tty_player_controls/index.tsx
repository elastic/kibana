/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, ChangeEvent, MouseEvent, useMemo } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { ProcessEntityIdIOLine, ProcessEvent } from '../../../common/types/process_tree';
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

export interface TTYPlayerControlsDeps {
  currentProcessEvent: ProcessEvent | undefined;
  processIdLineMap: Record<string, ProcessEntityIdIOLine>;
  lastProcessEntityId: string | undefined;
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
  processIdLineMap,
  lastProcessEntityId,
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

  const isFirstProcess = useMemo(
    () =>
      (currentProcessEvent?.process?.entity_id &&
        processIdLineMap[currentProcessEvent.process.entity_id].previous === undefined) ||
      false,
    [currentProcessEvent, processIdLineMap]
  );
  const isLastProcess = useMemo(
    () =>
      (currentProcessEvent?.process?.entity_id &&
        processIdLineMap[currentProcessEvent.process.entity_id].next === undefined) ||
      false,
    [currentProcessEvent, processIdLineMap]
  );

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
    if (lastProcessEntityId) {
      onSeekLine(processIdLineMap[lastProcessEntityId]?.value);
    }
  }, [lastProcessEntityId, onSeekLine, processIdLineMap]);

  const seekToPrevProcess = useCallback(() => {
    if (
      currentProcessEvent?.process?.entity_id &&
      processIdLineMap[currentProcessEvent.process.entity_id]?.previous !== undefined
    ) {
      onSeekLine(processIdLineMap[currentProcessEvent.process.entity_id]?.previous ?? 0);
    }
  }, [currentProcessEvent, processIdLineMap, onSeekLine]);

  const seekToNextProcess = useCallback(() => {
    if (
      currentProcessEvent?.process?.entity_id &&
      processIdLineMap[currentProcessEvent.process.entity_id]?.next !== undefined
    ) {
      onSeekLine(processIdLineMap[currentProcessEvent.process.entity_id]?.next ?? 0);
    }
  }, [currentProcessEvent, processIdLineMap, onSeekLine]);

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
              aria-label="TTY Start Button"
              onClick={seekToStart}
              disabled={isFirstProcess}
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
              aria-label="TTY Previous Button"
              onClick={seekToPrevProcess}
              disabled={isFirstProcess}
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
              aria-label="TTY Play Button"
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
              aria-label="TTY Next Button"
              onClick={seekToNextProcess}
              disabled={isLastProcess}
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
              aria-label="TTY End Button"
              onClick={seekToEnd}
              disabled={isLastProcess}
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiRange
            value={currentLine}
            min={0}
            max={Math.max(0, linesLength - 1)}
            onChange={onLineChange}
            fullWidth
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconSide="right"
            size="s"
            onClick={handleViewInSession}
            iconType="arrowRight"
          >
            {VIEW_IN_SESSION}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{textSizer}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
