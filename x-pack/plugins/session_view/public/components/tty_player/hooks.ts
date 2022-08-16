/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from 'react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { SearchAddon } from './xterm_search';
import { useEuiTheme } from '../../hooks';
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
} from '../../../common/constants';

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

      const events = res.events?.map((event: any) => event._source as ProcessEvent) ?? [];

      return { events, cursor, total: res.total };
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.events.length >= IO_EVENTS_PER_PAGE) {
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
          if (event?.process?.io?.text) {
            const data: IOLine[] = event.process.io.text.split(/\n\r?/).map((line) => {
              return {
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
  lines: IOLine[];
  hasNextPage?: boolean;
  fetchNextPage?: () => void;
  isFullscreen?: boolean;
}

export const useXtermPlayer = ({
  ref,
  isPlaying,
  lines,
  hasNextPage,
  fetchNextPage,
  isFullscreen,
}: XtermPlayerDeps) => {
  const { euiTheme } = useEuiTheme();
  const { font, colors } = euiTheme;
  const [currentLine, setCurrentLine] = useState(0);
  const [userSeeked, setUserSeeked] = useState(false);
  const [playSpeed] = useState(DEFAULT_TTY_PLAYSPEED_MS); // potentially configurable

  const [terminal, fitAddon, searchAddon] = useMemo(() => {
    const term = new Terminal({
      theme: {
        background: 'rgba(0,0,0,0)',
        selection: colors.warning,
      },
      fontFamily: font.familyCode,
      fontSize: 11,
      allowTransparency: true,
    });

    const fitInstance = new FitAddon();
    const searchInstance = new SearchAddon();

    term.loadAddon(fitInstance);
    term.loadAddon(searchInstance);

    return [term, fitInstance, searchInstance];
  }, [colors, font]);

  useEffect(() => {
    if (ref.current) {
      terminal.open(ref.current);
    }
  }, [terminal, ref]);

  useEffect(() => {
    // isFullscreen check is there just to avoid the necessary "unnecessary" react-hook dep
    // When isFullscreen changes, e.g goes from false to true and vice versa, we need to call fit.
    if (isFullscreen !== undefined) {
      fitAddon.fit();
    }
  }, [isFullscreen, fitAddon]);

  const render = useCallback(
    (lineNumber: number) => {
      if (lines.length === 0) {
        return;
      }

      let linesToPrint;

      if (userSeeked) {
        linesToPrint = lines.slice(0, lineNumber);
        terminal.clear();
        setUserSeeked(false);
      } else {
        linesToPrint = [lines[lineNumber]];
      }

      linesToPrint.forEach((line, index) => {
        if (line?.value !== undefined) {
          terminal.writeln(line.value);
        }
      });
    },
    [terminal, lines, userSeeked]
  );

  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        if (!isPlaying) {
          return;
        }

        if (currentLine < lines.length) {
          setCurrentLine(currentLine + 1);
        }
      }, playSpeed);

      return () => {
        clearInterval(timer);
      };
    }
  }, [lines, currentLine, isPlaying, playSpeed]);

  useEffect(() => {
    render(currentLine);

    if (hasNextPage && fetchNextPage && currentLine === lines.length - 1) {
      fetchNextPage();
    }
  }, [fetchNextPage, currentLine, lines, render, hasNextPage]);

  const seekToLine = useCallback((line) => {
    setUserSeeked(true);
    setCurrentLine(line);
  }, []);

  const search = useCallback(
    (query: string, startCol: number) => {
      searchAddon.findNext(query, { caseSensitive: false, lastLineOnly: true, startCol });
    },
    [searchAddon]
  );

  const fit = useCallback(() => {
    fitAddon.fit();
  }, [fitAddon]);

  return {
    terminal,
    currentLine,
    seekToLine,
    search,
    fit,
  };
};
