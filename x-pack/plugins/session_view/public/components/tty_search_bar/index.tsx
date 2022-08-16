/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { SessionViewSearchBar } from '../session_view_search_bar';
import { IOLine } from '../../../common/types/process_tree';

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

  useEffect(() => {
    if (currentMatch) {
      const goToLine = lines.indexOf(currentMatch.line);
      seekToLine(goToLine);
    }

    const timeout = setTimeout(() => {
      return xTermSearchFn(searchQuery, currentMatch?.index || 0);
    }, 100);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentMatch, searchQuery, lines, xTermSearchFn, seekToLine]);

  const searchResults = useMemo(() => {
    if (searchQuery) {
      const matches: SearchResult[] = [];

      lines.reduce((previous: SearchResult[], current: IOLine) => {
        if (current.value) {
          const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig');
          const lineMatches = current.value.matchAll(regex);
          if (lineMatches) {
            for (const match of lineMatches) {
              previous.push({ line: current, match: match[0], index: match.index || 0 });
            }
          }
        }

        return previous;
      }, matches);

      if (matches.length > 0) {
        setCurrentMatch(matches[0]);
      } else {
        setCurrentMatch(null);
      }

      return matches;
    }

    return [];
  }, [searchQuery, lines]);

  const onSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentMatch(null);
  }, []);

  const onSetCurrentMatch = useCallback(
    (index) => {
      const match = searchResults[index];

      if (match && currentMatch !== match) {
        setCurrentMatch(match);
      }
    },
    [currentMatch, searchResults]
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
