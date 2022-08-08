/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, {
  useRef,
  useEffect,
  useMemo,
  useState,
  useCallback,
  ChangeEvent,
  MouseEvent,
} from 'react';
import { EuiPanel, EuiRange, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { useStyles } from './styles';
import { useFetchIOEvents, useIOLines, useXtermPlayer } from './hooks';
import { IOLine } from '../../../common/types/process_tree';

export interface TTYPlayerDeps {
  sessionEntityId: string; // TODO: we should not load by session id, but instead a combo of process.tty.major+minor, session time range, and host.boot_id (see Rabbitholes section of epic).
  onClose(): void;
  isFullscreen: boolean;
}

interface SearchResult {
  line: IOLine;
  matches: string[];
}

export const TTYPlayer = ({ sessionEntityId, onClose, isFullscreen }: TTYPlayerDeps) => {
  const styles = useStyles();
  const ref = useRef(null);

  const { data, error, fetchNextPage, hasNextPage, isFetching } = useFetchIOEvents(sessionEntityId);
  const lines = useIOLines(data?.pages);
  const [isPlaying, setIsPlaying] = useState(false);
  const { search, fit, currentLine, seekToLine } = useXtermPlayer(
    ref,
    isPlaying,
    lines,
    hasNextPage,
    fetchNextPage,
    isFullscreen
  );

  const [currentMatch, setCurrentMatch] = useState<{ match: SearchResult; index: number } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const onLineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
      const line = parseInt((event?.target as HTMLInputElement).value || '0', 10);
      seekToLine(line);
      setCurrentMatch(null);
      setIsPlaying(false);
    },
    [seekToLine]
  );

  const onSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    if (currentMatch) {
      const goToLine = lines.indexOf(currentMatch.match.line) + 1;
      seekToLine(goToLine);

      const timeout = setTimeout(() => {
        return search(searchQuery);
      }, 100);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [currentMatch, currentLine, searchQuery, lines, search, seekToLine]);

  const searchResults = useMemo(() => {
    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      const matches: SearchResult[] = [];

      lines.reduce((previous: SearchResult[], current: IOLine) => {
        if (current.value) {
          const match = current.value.match(regex);
          if (match) {
            previous.push({ line: current, matches: match });
          }
        }

        return previous;
      }, matches);

      if (matches.length > 0) {
        setCurrentMatch({ match: matches[0], index: 0 });
      } else {
        setCurrentMatch(null);
      }

      return matches;
    }

    return [];
  }, [searchQuery, lines]);

  const totalMatches = useMemo(() => {
    return searchResults.reduce((previous: number, current: SearchResult) => {
      return previous + current.matches.length;
    }, 0);
  }, [searchResults]);

  const getMatchByIndex = useCallback(
    (index) => {
      let i = 0;
      return searchResults.find((value) => {
        if (index < i + value.matches.length) {
          return true;
        }

        i += value.matches.length;
      });
    },
    [searchResults]
  );

  const onNext = useCallback(
    (index) => {
      const match = getMatchByIndex(index);

      if (match) {
        if (currentMatch?.match !== match) {
          setCurrentMatch({ match, index: 0 });
        } else {
          setCurrentMatch({ match, index: currentMatch.index + 1 });
        }
      }
    },
    [currentMatch, getMatchByIndex]
  );

  const onPrevious = useCallback(
    (index) => {
      const match = getMatchByIndex(index);

      if (match) {
        if (currentMatch?.match !== match) {
          setCurrentMatch({ match, index: match.matches.length });
        } else {
          setCurrentMatch({ match, index: currentMatch.index - 1 });
        }
      }
    },
    [currentMatch, getMatchByIndex]
  );

  const onTogglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  return (
    <div css={styles.container}>
      <EuiPanel hasShadow={false} borderRadius="none">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem data-test-subj="sessionView:sessionViewOutputSearch">
            <SessionViewSearchBar
              searchQuery={searchQuery}
              setSearchQuery={onSearch}
              totalMatches={totalMatches}
              onNext={onNext}
              onPrevious={onPrevious}
            />
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              display="empty"
              size="m"
              aria-label="TTY Output Close Button"
              data-test-subj="sessionView:sessionViewTTYCloseBtn"
              onClick={onClose}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <div ref={ref} css={styles.terminal} />
      <EuiPanel hasShadow={false} borderRadius="none">
        <EuiFlexGroup alignItems="center" gutterSize="s" direction="row">
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isPlaying ? 'pause' : 'play'}
              display="empty"
              size="m"
              aria-label="TTY Play Button"
              data-test-subj="sessionView:sessionViewTTYPlayBtn"
              onClick={onTogglePlayback}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiRange
              value={currentLine}
              min={0}
              max={lines.length}
              onChange={onLineChange}
              fullWidth
              showInput
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
