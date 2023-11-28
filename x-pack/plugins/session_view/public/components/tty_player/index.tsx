/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiButton,
  EuiThemeProvider,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { CoreStart } from '@kbn/core/public';
import useResizeObserver from 'use-resize-observer';
import { throttle } from 'lodash';
import type { ProcessEvent } from '../../../common';
import { TTYSearchBar } from '../tty_search_bar';
import { TTYTextSizer } from '../tty_text_sizer';
import { useStyles } from './styles';
import {
  DEFAULT_TTY_ROWS,
  DEFAULT_TTY_COLS,
  DEFAULT_TTY_FONT_SIZE,
  POLICIES_PAGE_PATH,
  SECURITY_APP_ID,
} from '../../../common/constants';
import { SessionViewTelemetryKey } from '../../types';
import { useFetchIOEvents, useIOLines, useXtermPlayer } from './hooks';
import { TTYPlayerControls } from '../tty_player_controls';
import { TOGGLE_TTY_PLAYER, DETAIL_PANEL } from '../session_view/translations';

export interface TTYPlayerDeps {
  index: string;
  sessionEntityId: string;
  sessionStartTime: string;
  show: boolean;
  onClose(): void;
  isFullscreen: boolean;
  onJumpToEvent(event: ProcessEvent): void;
  autoSeekToEntityId?: string;
  canReadPolicyManagement?: boolean;
  trackEvent(name: SessionViewTelemetryKey): void;
}

export const TTYPlayer = ({
  index,
  sessionEntityId,
  sessionStartTime,
  show,
  onClose,
  isFullscreen,
  onJumpToEvent,
  autoSeekToEntityId,
  canReadPolicyManagement,
  trackEvent,
}: TTYPlayerDeps) => {
  const ref = useRef<HTMLDivElement>(null);
  const { ref: scrollRef, height: containerHeight = 1 } = useResizeObserver<HTMLDivElement>({});

  const { data, fetchNextPage, hasNextPage, isFetching, refetch } = useFetchIOEvents(
    index,
    sessionEntityId,
    sessionStartTime
  );
  const { lines, processStartMarkers } = useIOLines(data?.pages);
  const [fontSize, setFontSize] = useState(DEFAULT_TTY_FONT_SIZE);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentAutoSeekEntityId, setCurrentAutoSeekEntityId] = useState('');
  const { getUrlForApp } = useKibana<CoreStart>().services.application;
  const policiesUrl = useMemo(
    () =>
      canReadPolicyManagement ? getUrlForApp(SECURITY_APP_ID, { path: POLICIES_PAGE_PATH }) : '',
    [canReadPolicyManagement, getUrlForApp]
  );

  const { search, currentLine, seekToLine } = useXtermPlayer({
    ref,
    isPlaying,
    setIsPlaying,
    lines,
    fontSize,
    hasNextPage,
    fetchNextPage,
    isFetching,
    policiesUrl,
  });

  const currentProcessEvent = lines[Math.min(lines.length - 1, currentLine)]?.event;
  const tty = currentProcessEvent?.process?.tty;

  useEffect(() => {
    if (show) {
      // refetch the most recent page when tty player is loaded
      refetch({ refetchPage: (_page, i, allPages) => allPages.length - 1 === i });
    }
  }, [refetch, show]);

  useEffect(() => {
    if (
      autoSeekToEntityId &&
      currentAutoSeekEntityId !== autoSeekToEntityId &&
      currentProcessEvent?.process?.entity_id !== autoSeekToEntityId
    ) {
      const foundMarker = processStartMarkers.find((marker) => {
        if (marker.event.process?.entity_id === autoSeekToEntityId) {
          return true;
        }
        return false;
      });

      if (foundMarker) {
        seekToLine(foundMarker.line);
        setCurrentAutoSeekEntityId(autoSeekToEntityId);
      } else {
        seekToLine(lines.length - 1); // seek to end to force next page to load.
      }
    }
  }, [
    autoSeekToEntityId,
    currentAutoSeekEntityId,
    currentProcessEvent?.process?.entity_id,
    lines.length,
    processStartMarkers,
    seekToLine,
  ]);

  const validTTY = tty?.rows && tty?.rows > 1 && tty?.rows < 1000;
  if (tty && !validTTY) {
    tty.rows = DEFAULT_TTY_ROWS;
    tty.columns = DEFAULT_TTY_COLS;
  }

  const styles = useStyles(tty, show);

  const clearSearch = useCallback(() => {
    if (searchQuery) {
      setSearchQuery('');
    }
  }, [searchQuery]);

  const onSeekLine = useMemo(() => {
    return throttle((line: number) => {
      clearSearch();
      seekToLine(line);
    }, 100);
  }, [clearSearch, seekToLine]);

  const onTogglePlayback = useCallback(() => {
    // if at the end, seek to beginning
    if (currentLine >= lines.length - 1) {
      seekToLine(0);
    }
    setIsPlaying(!isPlaying);

    if (isPlaying) {
      trackEvent('tty_playback_started');
    } else {
      trackEvent('tty_playback_stopped');
    }
  }, [currentLine, isPlaying, lines.length, seekToLine, trackEvent]);

  useEffect(() => {
    if (isPlaying) {
      clearSearch();
    }
  }, [clearSearch, isPlaying]);

  return (
    <div css={styles.container}>
      <EuiPanel hasShadow={false} borderRadius="none" hasBorder={false} css={styles.header}>
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem data-test-subj="sessionView:TTYSearch">
            <TTYSearchBar
              lines={lines}
              seekToLine={seekToLine}
              xTermSearchFn={search}
              setIsPlaying={setIsPlaying}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              isSelected={true}
              display="fill"
              isLoading={isFetching}
              iconType="apmTrace"
              onClick={onClose}
              size="m"
              aria-label={TOGGLE_TTY_PLAYER}
              data-test-subj="sessionView:TTYPlayerClose"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="refresh"
              display="empty"
              size="m"
              disabled={true}
              aria-label="disabled"
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon iconType="eye" disabled={true} size="m" aria-label="disabled" />
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

      <EuiThemeProvider colorMode="dark">
        <TTYPlayerControls
          currentProcessEvent={currentProcessEvent}
          processStartMarkers={processStartMarkers}
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
              containerHeight={containerHeight}
              fontSize={fontSize}
              onFontSizeChanged={setFontSize}
              isFullscreen={isFullscreen}
            />
          }
        />
      </EuiThemeProvider>
    </div>
  );
};
