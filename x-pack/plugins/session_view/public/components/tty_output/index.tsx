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
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';
import { throttle } from 'lodash';
import { EuiPanel, EuiRange, EuiFlexGroup, EuiFlexItem, EuiButtonIcon } from '@elastic/eui';
import { SearchAddon } from './search';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { useEuiTheme } from '../../hooks';
import { useStyles } from './styles';
import {
  useFetchIOEvents,
  useIOLines,
} from './hooks';
import { IOLine } from '../../../common/types/process_tree';

const PLAYHEAD_SPEED = 40;

export interface TTYOutputDeps {
  sessionEntityId: string;
  onClose(): void;
}

interface SearchResult {
  line: IOLine;
  matches: string[];
}

export const TTYOutput = ({ sessionEntityId, onClose }: TTYOutputDeps) => {
  const styles = useStyles();
  const ref = useRef(null);
  const { euiTheme } = useEuiTheme();
  const { font, colors } = euiTheme;

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useFetchIOEvents(sessionEntityId);

  const lines = useIOLines(data?.pages);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLine, setCurrentLine] = useState(0);
  const [lastLinePrinted, setLastLinePrinted] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<{ match: SearchResult; index: number } | null>(
    null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const [terminal, fitAddon, searchAddon] = useMemo(() => {
    const term = new Terminal({
      theme: {
        // foreground: '#ffffff',
        background: 'rgba(0,0,0,0)',
        selection: colors.warning,
      },
      fontFamily: font.familyCode,
      fontSize: 12,
      allowTransparency: true,
    });

    const fitInstance = new FitAddon();
    const searchInstance = new SearchAddon();

    term.loadAddon(fitInstance);
    term.loadAddon(searchInstance);

    return [term, fitInstance, searchInstance];
  }, []);

  useEffect(() => {
    if (isPlaying) {
      const timer = setInterval(() => {
        if (!isPlaying) {
          return;
        }

        if (currentLine < lines.length) {
          setCurrentLine(currentLine + 1);
        } else if (!hasNextPage) {
          setIsPlaying(false);
        }
      }, PLAYHEAD_SPEED);

      return () => {
        clearInterval(timer);
      }
    }
  }, [lines, currentLine, isPlaying]);

  const onLineChange = useCallback(
    (event: ChangeEvent<HTMLInputElement> | MouseEvent<HTMLButtonElement>) => {
      const value = parseInt((event?.target as HTMLInputElement).value || '0', 10);
      setCurrentMatch(null);
      setCurrentLine(value);
      setLastLinePrinted(0);
    },
    [lines, hasNextPage, fetchNextPage]
  );

  useEffect(() => {
    if (ref.current) {
      terminal.open(ref.current);
      fitAddon.fit();
    }
  }, [terminal]);

  fitAddon.fit();

  const renderLines = useCallback(throttle((curLine) => {
    const linesToPrint = lines.slice(lastLinePrinted, curLine);

    if (lastLinePrinted === 0) {
      terminal.clear();
    }

    linesToPrint.forEach((line) => {
      if (line.value !== undefined) {
        terminal.writeln(line.value);
      }
    });

    setLastLinePrinted(curLine);
  }, 100), [terminal, lines, lastLinePrinted]);

  useEffect(() => {
    renderLines(currentLine);

    if (hasNextPage && currentLine === lines.length - 1) {
      fetchNextPage();
    }
  }, [currentLine]);

  const onSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  useEffect(() => {
    if (currentMatch) {
      const goToLine = lines.indexOf(currentMatch.match.line) + 1;
      setCurrentLine(goToLine);

      const timeout = setTimeout(() => {
        return searchAddon.findNext(searchQuery, { caseSensitive: false, lastLineOnly: true });
      }, 100);

      return () => {
        clearTimeout(timeout);
      };
    }
  }, [currentMatch, currentLine]);

  const searchResults = useMemo(() => {
    if (searchQuery) {
      const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
      const matches: SearchResult[] = [];

      lines.reduce((previous: SearchResult[], current: IOLine) => {
        if (current.value) {
          const matches = current.value.match(regex);
          if (matches) {
            previous.push({ line: current, matches });
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
  }, [searchQuery]);

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
    [currentMatch, searchAddon, getMatchByIndex]
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
    [currentMatch, searchAddon, getMatchByIndex]
  );

  const alerts = useMemo(() => {
    const stuff = [];

    if (lines.length > 150) {
      stuff.push({
        min: 150,
        max: 152,
        color: 'danger',
      });
    }
    if (lines.length > 200) {
      stuff.push({
        min: 200,
        max: 204,
        color: 'danger',
      });
    }

    return stuff;
  }, [lines.length]);

  const levels = useMemo(
    () => [
      ...alerts,
      ...searchResults.map((value: SearchResult) => {
        const lineIndex = lines.indexOf(value.line);

        return {
          min: lineIndex,
          max: lineIndex + 1,
          color: 'warning',
        };
      }),
    ],
    [searchResults, alerts]
  );

  const onTogglePlayback = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const ticks = useMemo(() => {
    const processes = [];

    if (lines.length > 0) {
      processes.push({ value: 0, label: 'bash' });
    }

    if (lines.length > 17) {
      processes.push({ value: 17, label: 'vim' });
    }

    if (lines.length > 283) {
      processes.push({ value: 283, label: 'bash' });
    }

    return processes;
  }, [lines.length]);

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
        <EuiFlexGroup alignItems="center" gutterSize="s" direction='row'>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType={isPlaying ? "pause" : "play"}
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
              levels={levels}
              ticks={ticks}
              showInput
              showTicks
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </div>
  );
};
