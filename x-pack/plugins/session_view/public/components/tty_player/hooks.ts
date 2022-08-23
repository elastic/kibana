/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SearchAddon } from './xterm_search';
import { useEuiTheme } from '../../hooks';

// eslint-disable-next-line @kbn/imports/no_boundary_crossing
import { sessionViewIOEventsMock } from '../../../common/mocks/responses/session_view_io_events.mock';

import {
  IOLine,
  ProcessEvent,
  ProcessEventResults,
  ProcessEventsPage,
} from '../../../common/types/process_tree';
import {
  IO_EVENTS_ROUTE,
  IO_EVENTS_PER_PAGE,
  QUERY_KEY_IO_EVENTS,
  DEFAULT_TTY_PLAYSPEED_MS,
  DEFAULT_TTY_FONT_SIZE,
  TTY_LINE_SPLITTER_REGEX,
} from '../../../common/constants';

const MOCK_DEBUG = false; // This code will be removed once we have an agent to test with.

export const useFetchIOEvents = (sessionEntityId: string) => {
  const { http } = useKibana<CoreStart>().services;
  const cachingKeys = useMemo(() => [QUERY_KEY_IO_EVENTS, sessionEntityId], [sessionEntityId]);

  const query = useInfiniteQuery(
    cachingKeys,
    async ({ pageParam = {} }) => {
      const { cursor } = pageParam;
      const res = await http.get<ProcessEventResults>(IO_EVENTS_ROUTE, {
        query: {
          sessionEntityId,
          cursor,
        },
      });

      if (MOCK_DEBUG) {
        res.events = sessionViewIOEventsMock.events;
        res.total = res.events?.length || 0;
      }

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return { events, cursor, total: res.total };
    },
    {
      getNextPageParam: (lastPage) => {
        if (!MOCK_DEBUG && lastPage.events.length >= IO_EVENTS_PER_PAGE) {
          return {
            cursor: lastPage.events[lastPage.events.length - 1]['@timestamp'],
          };
        }
      },
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
    }
  );

  return query;
};

/**
 * flattens all pages of IO events into an array of lines
 * note: not efficient currently, tracking a page cursor to avoid redoing work is needed.
 */
export const useIOLines = (pages: ProcessEventsPage[] | undefined) => {
  const lines: IOLine[] = useMemo(() => {
    const newLines: IOLine[] = [];

    if (!pages) {
      return newLines;
    }

    return pages.reduce((previous, current) => {
      if (current.events) {
        current.events.forEach((event) => {
          const { process } = event;
          if (process?.io?.text !== undefined) {
            const splitLines = process.io.text.split(TTY_LINE_SPLITTER_REGEX);
            const combinedLines = [splitLines[0]];

            // delimiters e.g \r\n or cursor movements are merged with their line text
            // we start on an odd number so that cursor movements happen at the start of each line
            // this is needed for the search to work accurately
            for (let i = 1; i < splitLines.length - 1; i = i + 2) {
              combinedLines.push(splitLines[i] + splitLines[i + 1]);
            }

            const data: IOLine[] = combinedLines.map((line) => {
              return {
                event, // pointer to the event so it's easy to look up other details for the line
                value: line,
              };
            });

            previous = previous.concat(data);
          }
        });
      }

      return previous;
    }, newLines);
  }, [pages]);

  return lines;
};

export interface XtermPlayerDeps {
  ref: React.RefObject<HTMLElement>;
  isPlaying: boolean;
  setIsPlaying(value: boolean): void;
  lines: IOLine[];
  fontSize: number;
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
}

export const useXtermPlayer = ({
  ref,
  isPlaying,
  setIsPlaying,
  lines,
  fontSize,
  hasNextPage,
  fetchNextPage,
}: XtermPlayerDeps) => {
  const { euiTheme } = useEuiTheme();
  const { font, colors } = euiTheme;
  const [currentLine, setCurrentLine] = useState(0);
  const [playSpeed] = useState(DEFAULT_TTY_PLAYSPEED_MS); // potentially configurable
  const tty = lines?.[currentLine]?.event.process?.tty;

  const [terminal, searchAddon] = useMemo(() => {
    const term = new Terminal({
      theme: {
        selection: colors.warning,
      },
      fontFamily: font.familyCode,
      fontSize: DEFAULT_TTY_FONT_SIZE,
      scrollback: 0,
      convertEol: true,
    });

    const searchInstance = new SearchAddon();
    term.loadAddon(searchInstance);

    return [term, searchInstance];
  }, [font, colors]);

  useEffect(() => {
    if (ref.current && !terminal.element) {
      terminal.open(ref.current);
    }
  }, [terminal, ref]);

  const render = useCallback(
    (lineNumber: number, clear: boolean) => {
      if (lines.length === 0) {
        return;
      }

      let linesToPrint;

      if (clear) {
        linesToPrint = lines.slice(0, lineNumber + 1);
        terminal.reset();
        terminal.clear();
      } else {
        linesToPrint = [lines[lineNumber]];
      }

      linesToPrint.forEach((line, index) => {
        if (line?.value !== undefined) {
          terminal.write(line.value);
        }
      });
    },
    [terminal, lines]
  );

  useEffect(() => {
    const fontChanged = terminal.getOption('fontSize') !== fontSize;
    const ttyChanged = tty && (terminal.rows !== tty?.rows || terminal.cols !== tty?.columns);

    if (fontChanged) {
      terminal.setOption('fontSize', fontSize);
    }

    if (tty?.rows && tty?.columns && ttyChanged) {
      terminal.resize(tty.columns, tty.rows);
    }

    if (fontChanged || ttyChanged) {
      // clear and rerender
      render(currentLine, true);
    }
  }, [currentLine, fontSize, terminal, render, tty]);

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (!isPlaying) {
          return;
        }

        if (currentLine < lines.length - 1) {
          setCurrentLine(currentLine + 1);
        }

        render(currentLine, false);

        if (hasNextPage && fetchNextPage && currentLine === lines.length - 1) {
          fetchNextPage();
        }
      }, playSpeed);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [lines, currentLine, isPlaying, playSpeed, render, hasNextPage, fetchNextPage]);

  const seekToLine = useCallback(
    (index) => {
      setCurrentLine(index);
      setIsPlaying(false);

      render(index, true);
    },
    [setIsPlaying, render]
  );

  const search = useCallback(
    (query: string, startCol: number) => {
      searchAddon.findNext(query, { caseSensitive: false, lastLineOnly: true, startCol });
    },
    [searchAddon]
  );

  return {
    terminal,
    currentLine,
    seekToLine,
    search,
  };
};
