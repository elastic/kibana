/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Terminal } from 'xterm';
import 'xterm/css/xterm.css';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from './search';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useInfiniteQuery } from 'react-query';
import { CoreStart } from '@kbn/core/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { throttle } from 'lodash';
import { useEuiTheme } from '../../hooks';
import {
  IOLine,
  ProcessEvent,
  ProcessEventResults,
  ProcessEventsPage
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
    const lines: IOLine[] = [];

    if (!pages) {
      return lines;
    }

    return pages.reduce((previous, current) => {
      if (current.events) {
        current.events.forEach((event) => {
          if (event?.process?.io?.data) {
            const data: IOLine[] = event.process.io.data;

            previous = previous.concat(data);
          }
        });
      }

      return previous;
    }, lines);
  }, [pages?.length]);

  return lines;
};

export const useXtermPlayer = (
  ref: React.RefObject<HTMLElement>,
  isPlaying: boolean,
  lines: IOLine[]
) => {
  const { euiTheme } = useEuiTheme();
  const { font, colors } = euiTheme;
  const [currentLine, setCurrentLine] = useState(0);
  const [lastLineWritten, setLastLineWritten] = useState(0);
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
  }, []);

  useEffect(() => {
    if (ref.current) {
      terminal.open(ref.current);
      fitAddon.fit();
    }
  }, [fitAddon, terminal]);

  const render = useCallback(throttle((curLine) => {
    const linesToPrint = lines.slice(lastLineWritten, curLine);

    if (lastLineWritten === 0) {
      terminal.clear();
    }

    linesToPrint.forEach((line) => {
      if (line.value !== undefined) {
        terminal.writeln(line.value);
      }
    });

    setLastLineWritten(lastLineWritten + linesToPrint.length);
  }, 100), [terminal, currentLine, lastLineWritten]);

  useEffect(() => {
    if (isPlaying) {
      const frame = setInterval(render, playSpeed);

      return () => clearInterval(frame);
    }
  }, [isPlaying, playSpeed]);

  return {
    terminal,
    searchAddon,
    currentLine,
    setCurrentLine,
  }
};
