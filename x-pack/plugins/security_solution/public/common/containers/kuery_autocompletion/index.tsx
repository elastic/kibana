/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';
import { QuerySuggestion, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import { useKibana } from '../../lib/kibana';

type RendererResult = React.ReactElement<JSX.Element> | null;
type RendererFunction<RenderArgs, Result = RendererResult> = (args: RenderArgs) => Result;

interface KueryAutocompletionLifecycleProps {
  children: RendererFunction<{
    isLoadingSuggestions: boolean;
    loadSuggestions: (expression: string, cursorPosition: number, maxSuggestions?: number) => void;
    suggestions: QuerySuggestion[];
  }>;
  indexPattern: IIndexPattern;
}

interface KueryAutocompletionCurrentRequest {
  expression: string;
  cursorPosition: number;
}

export const KueryAutocompletion = React.memo<KueryAutocompletionLifecycleProps>(
  ({ children, indexPattern }) => {
    const [currentRequest, setCurrentRequest] = useState<KueryAutocompletionCurrentRequest | null>(
      null
    );
    const [suggestions, setSuggestions] = useState<QuerySuggestion[]>([]);
    const kibana = useKibana();
    const loadSuggestions = async (
      expression: string,
      cursorPosition: number,
      maxSuggestions?: number
    ) => {
      const language = 'kuery';

      if (!kibana.services.data.autocomplete.hasQuerySuggestions(language)) {
        return;
      }

      const futureRequest = {
        expression,
        cursorPosition,
      };
      setCurrentRequest({
        expression,
        cursorPosition,
      });
      setSuggestions([]);

      if (
        futureRequest &&
        futureRequest.expression !== (currentRequest && currentRequest.expression) &&
        futureRequest.cursorPosition !== (currentRequest && currentRequest.cursorPosition)
      ) {
        const newSuggestions =
          (await kibana.services.data.autocomplete.getQuerySuggestions({
            language: 'kuery',
            indexPatterns: [indexPattern],
            boolFilter: [],
            query: expression,
            selectionStart: cursorPosition,
            selectionEnd: cursorPosition,
          })) || [];

        setCurrentRequest(null);
        setSuggestions(maxSuggestions ? newSuggestions.slice(0, maxSuggestions) : newSuggestions);
      }
    };

    return children({
      isLoadingSuggestions: currentRequest !== null,
      loadSuggestions,
      suggestions,
    });
  }
);

KueryAutocompletion.displayName = 'KueryAutocompletion';
