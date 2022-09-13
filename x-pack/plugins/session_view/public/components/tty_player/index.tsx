/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback } from 'react';
import {
  EuiBetaBadge,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButton,
} from '@elastic/eui';
import { ProcessEvent } from '../../../common/types/process_tree';
import { TTYSearchBar } from '../tty_search_bar';
import { TTYTextSizer } from '../tty_text_sizer';
import { useStyles } from './styles';
import { DEFAULT_TTY_ROWS, DEFAULT_TTY_COLS, DEFAULT_TTY_FONT_SIZE } from '../../../common/constants';
import { useFetchIOEvents, useIOLines, useXtermPlayer } from './hooks';
import { TTYPlayerControls } from '../tty_player_controls';
import { BETA, TOGGLE_TTY_PLAYER, DETAIL_PANEL } from '../session_view/translations';
import { useStyles: useSessionViewStyles } from '../session_view/styles';

export interface TTYPlayerDeps {
  sessionEntityId: string;
  onClose(): void;
  isFullscreen: boolean;
  onJumpToEvent(event: ProcessEvent): void;
}

export const TTYPlayer = ({
  sessionEntityId,
  onClose,
  isFullscreen,
  onJumpToEvent,
}: TTYPlayerDeps) => {
  const ref = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage } = useFetchIOEvents(sessionEntityId);
  const { lines, processIdLineMap } = useIOLines(data?.pages);

  const [fontSize, setFontSize] = useState(DEFAULT_TTY_FONT_SIZE);
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
  const currentProcessEvent = lines[currentLine]?.event;

  if (tty && !tty.rows) {
    tty.rows = DEFAULT_TTY_ROWS;
    tty.columns = DEFAULT_TTY_COLS;
  }

  const styles = useStyles(tty);
  const sessionViewStyles = useSessionViewStyles();

  const onSeekLine = useCallback(
    (line: number) => {
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
      <EuiPanel hasShadow={false} borderRadius="none" className="sessionViewerToolbar">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiBetaBadge label={BETA} size="s" css={sessionViewStyles.betaBadge} />
          </EuiFlexItem>
          <EuiFlexItem data-test-subj="sessionView:TTYSearch">
            <TTYSearchBar lines={lines} seekToLine={seekToLine} xTermSearchFn={search} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              isSelected={true}
              display="fill"
              iconType="apmTrace"
              onClick={onClose}
              size="m"
              aria-label={TOGGLE_TTY_PLAYER}
              data-test-subj="sessionView:TTYPlayerClose"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="refresh" display="empty" size="m" disabled={true} />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="eye" disabled={true} size="m" />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButton iconType="list" disabled={true}>
              {DETAIL_PANEL}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      <div ref={scrollRef} className="eui-scrollBar" css={styles.scrollPane}>
        <div ref={ref} data-test-subj="sessionView:TTYPlayer" css={styles.terminal} />
      </div>

      <TTYPlayerControls
        currentProcessEvent={currentProcessEvent}
        processIdLineMap={processIdLineMap}
        lastProcessEntityId={lines[lines.length - 1]?.event.process?.entity_id}
        isPlaying={isPlaying}
        currentLine={currentLine}
        linesLength={lines.length}
        onSeekLine={onSeekLine}
        onTogglePlayback={onTogglePlayback}
        onClose={onClose}
        onJumpToEvent={onJumpToEvent}
        textSizer={
          <TTYTextSizer
            tty={tty}
            containerHeight={scrollRef?.current?.offsetHeight || 0}
            fontSize={fontSize}
            onFontSizeChanged={setFontSize}
          />
        }
      />
    </div>
  );
};
