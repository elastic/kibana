/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback, ChangeEvent, MouseEvent } from 'react';
import { EuiPanel, EuiRange, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { TTYSearchBar } from '../tty_search_bar';
import { TTYTextSizer } from '../tty_text_sizer';
import { useStyles } from './styles';
import { useFetchIOEvents, useIOLines, useXtermPlayer } from './hooks';

export interface TTYPlayerDeps {
  sessionEntityId: string; // TODO: we should not load by session id, but instead a combo of process.tty.major+minor, session time range, and host.boot_id (see Rabbitholes section of epic).
  onClose(): void;
  isFullscreen: boolean;
}

const DEFAULT_FONT_SIZE = 11;

export const TTYPlayer = ({ sessionEntityId, onClose, isFullscreen }: TTYPlayerDeps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage } = useFetchIOEvents(sessionEntityId);
  const lines = useIOLines(data?.pages);

  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [isPlaying, setIsPlaying] = useState(false);

  const { search, currentLine, seekToLine } = useXtermPlayer({
    ref,
    isPlaying,
    setIsPlaying,
    lines,
    fontSize,
    hasNextPage,
    fetchNextPage,
  });

  const tty = lines?.[currentLine]?.event?.process?.tty;
  const styles = useStyles(tty);

  const onLineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
      const line = parseInt((event?.target as HTMLInputElement).value || '0', 10);
      seekToLine(line);
      setIsPlaying(false);
    },
    [seekToLine]
  );

  const onTogglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  return (
    <div css={styles.container}>
      <EuiPanel hasShadow={false} borderRadius="none">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem data-test-subj="sessionView:TTYSearch">
            <TTYSearchBar lines={lines} seekToLine={seekToLine} xTermSearchFn={search} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              display="empty"
              size="m"
              aria-label="TTY Output Close Button"
              data-test-subj="sessionView:TTYCloseBtn"
              onClick={onClose}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <div ref={scrollRef} className="eui-scrollBar" css={styles.scrollPane}>
        <div ref={ref} data-test-subj="sessionView:TTYPlayer" css={styles.terminal} />
      </div>

      {/* the following will be replaced by a new <TTYPlayerControls/> component */}
      <EuiPanel
        data-test-subj="sessionView:TTYPlayerControls"
        hasShadow={false}
        borderRadius="none"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isPlaying ? 'pause' : 'play'}
              display="empty"
              size="m"
              aria-label="TTY Play Button"
              onClick={onTogglePlayback}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiRange
              value={currentLine}
              min={0}
              max={Math.max(0, lines.length - 1)}
              onChange={onLineChange}
              fullWidth
              showInput
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <TTYTextSizer
              tty={tty}
              containerHeight={scrollRef?.current?.offsetHeight || 0}
              fontSize={fontSize}
              onFontSizeChanged={setFontSize}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
