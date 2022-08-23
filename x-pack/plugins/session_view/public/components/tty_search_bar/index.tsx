/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useMemo, useState, useCallback } from 'react';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { IOLine } from '../../../common/types/process_tree';
import { TTY_STRIP_CONTROL_CODES_REGEX } from '../../../common/constants';

interface SearchResult {
  line: IOLine;
  match: string;
  index: number;
}

export interface TTYSearchBarDeps {
  lines: IOLine[];
  seekToLine(index: number): void;
  xTermSearchFn(query: string, index: number): void;
}

export const TTYSearchBar = ({ lines, seekToLine, xTermSearchFn }: TTYSearchBarDeps) => {
  const [currentMatch, setCurrentMatch] = useState<SearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const jumpToMatch = useCallback(
    (match) => {
      if (match) {
        const goToLine = lines.indexOf(match.line);
        seekToLine(goToLine);
      }

      const timeout = setTimeout(() => {
        return xTermSearchFn(searchQuery, match?.index || 0);
      }, 100);

      return () => {
        clearTimeout(timeout);
      };
    },
    [lines, seekToLine, xTermSearchFn, searchQuery]
  );

  const searchResults = useMemo(() => {
    const matches: SearchResult[] = [];

    if (searchQuery) {
      lines.reduce((previous: SearchResult[], current: IOLine) => {
        if (current.value) {
          // check for cursor movement at the start of the line
          const cursorMovement = current.value.match(/^\x1b\[\d+;(\d+)(H|d)/);
          const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
          const lineMatches = current.value
            .replace(TTY_STRIP_CONTROL_CODES_REGEX, '')
            .replace(/^\r?\n/, '')
            .matchAll(regex);

          if (lineMatches) {
            for (const match of lineMatches) {
              let matchOffset = 0;

              if (cursorMovement) {
                // the column position 1 based e.g \x1b[39;5H means row 39 column 5
                matchOffset = parseInt(cursorMovement[1], 10) - 3;
              }

              previous.push({
                line: current,
                match: match[0],
                index: matchOffset + (match.index || 0),
              });
            }
          }
        }

        return previous;
      }, matches);
    }

    if (matches.length > 0) {
      const firstMatch = matches[0];
      setCurrentMatch(firstMatch);
      jumpToMatch(firstMatch);
    } else {
      setCurrentMatch(null);
      xTermSearchFn('', 0);
    }

    return matches;
  }, [searchQuery, lines, jumpToMatch, xTermSearchFn]);

  const onSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentMatch(null);
  }, []);

  const onSetCurrentMatch = useCallback(
    (index) => {
      const match = searchResults[index];

      if (match && currentMatch !== match) {
        setCurrentMatch(match);
        jumpToMatch(match);
      }
    },
    [jumpToMatch, currentMatch, searchResults]
  );

  return (
    <SessionViewSearchBar
      searchQuery={searchQuery}
      setSearchQuery={onSearch}
      totalMatches={searchResults.length}
      onNext={onSetCurrentMatch}
      onPrevious={onSetCurrentMatch}
    />
  );
};
