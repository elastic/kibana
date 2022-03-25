/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState } from 'react';
import { IIndexPattern, QuerySuggestion } from '../../../../../../src/plugins/data/public';
import { AutocompleteField } from './autocomplete_field';
import { WithKueryAutocompletion } from './with_kuery_autocompletion';

type LoadSuggestionsFn = (
  e: string,
  p: number,
  m?: number,
  transform?: (s: QuerySuggestion[]) => QuerySuggestion[]
) => void;
export type CurryLoadSuggestionsType = (loadSuggestions: LoadSuggestionsFn) => LoadSuggestionsFn;

interface Props {
  derivedIndexPattern: IIndexPattern;
  onSubmit: (query: string) => void;
  onChange?: (query: string) => void;
  value?: string | null;
  placeholder?: string;
  curryLoadSuggestions?: CurryLoadSuggestionsType;
}

function validateQuery(query: string) {
  try {
    fromKueryExpression(query);
  } catch (err) {
    return false;
  }
  return true;
}

export const KueryBar = ({
  derivedIndexPattern,
  onSubmit,
  onChange,
  value,
  placeholder,
  curryLoadSuggestions = defaultCurryLoadSuggestions,
}: Props) => {
  const [draftQuery, setDraftQuery] = useState<string>(value || '');
  const [isValid, setValidation] = useState<boolean>(true);

  // This ensures that if value changes out side this component it will update.
  useEffect(() => {
    if (value) {
      setDraftQuery(value);
    }
  }, [value]);

  const handleChange = (query: string) => {
    setValidation(validateQuery(query));
    setDraftQuery(query);
    if (onChange) {
      onChange(query);
    }
  };

  const filteredDerivedIndexPattern = {
    ...derivedIndexPattern,
    fields: derivedIndexPattern.fields,
  };

  const defaultPlaceholder = i18n.translate('xpack.monitoring.alerts.kqlSearchFieldPlaceholder', {
    defaultMessage: 'Search for monitoring data',
  });

  return (
    <WithKueryAutocompletion indexPattern={filteredDerivedIndexPattern}>
      {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
        <AutocompleteField
          aria-label={placeholder}
          isLoadingSuggestions={isLoadingSuggestions}
          isValid={isValid}
          loadSuggestions={curryLoadSuggestions(loadSuggestions)}
          onChange={handleChange}
          onSubmit={onSubmit}
          placeholder={placeholder || defaultPlaceholder}
          suggestions={suggestions}
          value={draftQuery}
        />
      )}
    </WithKueryAutocompletion>
  );
};

const defaultCurryLoadSuggestions: CurryLoadSuggestionsType =
  (loadSuggestions) =>
  (...args) =>
    loadSuggestions(...args);
