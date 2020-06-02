/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { $Keys } from 'utility-types';
import { FormattedMessage } from '@kbn/i18n/react';
import { KqlQuerySuggestionProvider } from './types';
import {
  QuerySuggestion,
  QuerySuggestionTypes,
} from '../../../../../../../src/plugins/data/public';

const bothArgumentsText = (
  <FormattedMessage
    id="xpack.data.kueryAutocomplete.andOperatorDescription.bothArgumentsText"
    defaultMessage="both arguments"
    description="Part of xpack.data.kueryAutocomplete.andOperatorDescription. Full text: 'Requires both arguments to be true'"
  />
);

const oneOrMoreArgumentsText = (
  <FormattedMessage
    id="xpack.data.kueryAutocomplete.orOperatorDescription.oneOrMoreArgumentsText"
    defaultMessage="one or more arguments"
    description="Part of xpack.data.kueryAutocomplete.orOperatorDescription. Full text: 'Requires one or more arguments to be true'"
  />
);

const conjunctions: Record<string, JSX.Element> = {
  and: (
    <p>
      <FormattedMessage
        id="xpack.data.kueryAutocomplete.andOperatorDescription"
        defaultMessage="Requires {bothArguments} to be true"
        values={{
          bothArguments: <span className="kbnSuggestionItem__callout">{bothArgumentsText}</span>,
        }}
        description="Full text: ' Requires both arguments to be true'. See
          'xpack.data.kueryAutocomplete.andOperatorDescription.bothArgumentsText' for 'both arguments' part."
      />
    </p>
  ),
  or: (
    <p>
      <FormattedMessage
        id="xpack.data.kueryAutocomplete.orOperatorDescription"
        defaultMessage="Requires {oneOrMoreArguments} to be true"
        values={{
          oneOrMoreArguments: (
            <span className="kbnSuggestionItem__callout">{oneOrMoreArgumentsText}</span>
          ),
        }}
        description="Full text: 'Requires one or more arguments to be true'. See
          'xpack.data.kueryAutocomplete.orOperatorDescription.oneOrMoreArgumentsText' for 'one or more arguments' part."
      />
    </p>
  ),
};

export const setupGetConjunctionSuggestions: KqlQuerySuggestionProvider = (core) => {
  return (querySuggestionsArgs, { text, end }) => {
    let suggestions: QuerySuggestion[] | [] = [];

    if (text.endsWith(' ')) {
      suggestions = Object.keys(conjunctions).map((key: $Keys<typeof conjunctions>) => ({
        type: QuerySuggestionTypes.Conjunction,
        text: `${key} `,
        description: conjunctions[key],
        start: end,
        end,
      }));
    }

    return Promise.resolve(suggestions);
  };
};
