/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, ChangeEvent, MouseEvent, useMemo } from 'react';
import { EuiPanel, EuiRange, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { ProcessEntityIdIOLine } from '../../../common/types/process_tree';
import { useStyles } from './styles';

export interface TTYPlayerControlsDeps {
  currentProcessEntityId: string | undefined;
  processIdLineMap: Record<string, ProcessEntityIdIOLine>;
  lastProcessEntityId: string | undefined;
  isPlaying: boolean;
  currentLine: number;
  linesLength: number;
  onSeekLine(line: number): void;
  onTogglePlayback(): void;
  textSizer: JSX.Element;
}

export const TTYPlayerControls = ({
  currentProcessEntityId,
  processIdLineMap,
  lastProcessEntityId,
  isPlaying,
  currentLine,
  linesLength,
  onSeekLine,
  onTogglePlayback,
  textSizer,
}: TTYPlayerControlsDeps) => {
  const styles = useStyles();

  const isFirstProcess = useMemo(
    () =>
      (currentProcessEntityId && processIdLineMap[currentProcessEntityId].previous === undefined) ||
      false,
    [currentProcessEntityId, processIdLineMap]
  );
  const isLastProcess = useMemo(
    () =>
      (currentProcessEntityId && processIdLineMap[currentProcessEntityId].next === undefined) ||
      false,
    [currentProcessEntityId, processIdLineMap]
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
      currentProcessEntityId &&
      processIdLineMap[currentProcessEntityId]?.previous !== undefined
    ) {
      onSeekLine(processIdLineMap[currentProcessEntityId]?.previous ?? 0);
    }
  }, [processIdLineMap, onSeekLine, currentProcessEntityId]);

  const seekToNextProcess = useCallback(() => {
    if (currentProcessEntityId && processIdLineMap[currentProcessEntityId]?.next !== undefined) {
      onSeekLine(processIdLineMap[currentProcessEntityId]?.next ?? 0);
    }
  }, [currentProcessEntityId, processIdLineMap, onSeekLine]);

  return (
    <EuiPanel data-test-subj="sessionView:TTYPlayerControls" hasShadow={false} borderRadius="none">
      <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            css={styles.controlButton}
            data-test-subj="sessionView:TTYPlayerControlsPlay"
            iconType={isPlaying ? 'pause' : 'play'}
            display="empty"
            size="m"
            aria-label="TTY Play Button"
            onClick={onTogglePlayback}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
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
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiRange
            value={currentLine}
            min={0}
            max={Math.max(0, linesLength - 1)}
            onChange={onLineChange}
            fullWidth
            showInput
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{textSizer}</EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
