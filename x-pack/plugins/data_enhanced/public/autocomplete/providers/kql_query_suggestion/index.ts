/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup } from 'kibana/public';
import { $Keys } from 'utility-types';
import { flatten, uniqBy } from 'lodash';
import { setupGetFieldSuggestions } from './field';
import { setupGetValueSuggestions } from './value';
import { setupGetOperatorSuggestions } from './operator';
import { setupGetConjunctionSuggestions } from './conjunction';
import {
  esKuery,
  QuerySuggestion,
  QuerySuggestionGetFnArgs,
  QuerySuggestionGetFn,
} from '../../../../../../../src/plugins/data/public';

const cursorSymbol = '@kuery-cursor@';

const dedup = (suggestions: QuerySuggestion[]): QuerySuggestion[] =>
  uniqBy(suggestions, ({ type, text, start, end }) => [type, text, start, end].join('|'));

export const KUERY_LANGUAGE_NAME = 'kuery';

export const setupKqlQuerySuggestionProvider = (core: CoreSetup): QuerySuggestionGetFn => {
  const providers = {
    field: setupGetFieldSuggestions(core),
    value: setupGetValueSuggestions(core),
    operator: setupGetOperatorSuggestions(core),
    conjunction: setupGetConjunctionSuggestions(core),
  };

  const getSuggestionsByType = (
    cursoredQuery: string,
    querySuggestionsArgs: QuerySuggestionGetFnArgs
  ): Array<Promise<QuerySuggestion[]>> | [] => {
    try {
      const cursorNode = esKuery.fromKueryExpression(cursoredQuery, {
        cursorSymbol,
        parseCursor: true,
      });

      return cursorNode.suggestionTypes.map((type: $Keys<typeof providers>) =>
        providers[type](querySuggestionsArgs, cursorNode)
      );
    } catch (e) {
      return [];
    }
  };

  return (querySuggestionsArgs) => {
    const { query, selectionStart, selectionEnd } = querySuggestionsArgs;
    const cursoredQuery = `${query.substr(0, selectionStart)}${cursorSymbol}${query.substr(
      selectionEnd
    )}`;

    return Promise.all(
      getSuggestionsByType(cursoredQuery, querySuggestionsArgs)
    ).then((suggestionsByType) => dedup(flatten(suggestionsByType)));
  };
};
