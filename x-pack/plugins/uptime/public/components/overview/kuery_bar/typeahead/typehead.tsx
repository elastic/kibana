/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, MouseEvent, useState, useRef, useEffect } from 'react';
import { EuiFieldSearch, EuiProgress, EuiOutsideClickDetector } from '@elastic/eui';
import { Suggestions } from './suggestions';
import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';
import { SearchType } from './search_type';
import { useKqlSyntax } from './use_kql_syntax';
import { useKeyEvents } from './use_key_events';
import { KQL_PLACE_HOLDER, SIMPLE_SEARCH_PLACEHOLDER } from './translations';
import { useSimpleQuery } from './use_simple_kuery';

interface TypeaheadProps {
  onChange: (inputValue: string, selectionStart: number | null) => void;
  onSubmit: (inputValue: string) => void;
  suggestions: QuerySuggestion[];
  queryExample: string;
  initialValue?: string;
  isLoading?: boolean;
  disabled?: boolean;
  dataTestSubj: string;
  ariaLabel: string;
  loadMore: () => void;
}

export const Typeahead: React.FC<TypeaheadProps> = ({
  initialValue,
  suggestions,
  onChange,
  onSubmit,
  dataTestSubj,
  ariaLabel,
  disabled,
  isLoading,
  loadMore,
}) => {
  const [value, setValue] = useState('');
  const [index, setIndex] = useState<number | null>(null);
  const [isSuggestionsVisible, setIsSuggestionsVisible] = useState(false);

  const [selected, setSelected] = useState<QuerySuggestion | null>(null);
  const [inputIsPristine, setInputIsPristine] = useState(true);
  const [lastSubmitted, setLastSubmitted] = useState('');

  const { kqlSyntax, setKqlSyntax } = useKqlSyntax({ setValue });

  const inputRef = useRef<HTMLInputElement>();

  const { setQuery } = useSimpleQuery();

  useEffect(() => {
    if (inputIsPristine && initialValue) {
      setValue(initialValue);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const selectSuggestion = (suggestion: QuerySuggestion) => {
    const nextInputValue =
      value.substr(0, suggestion.start) + suggestion.text + value.substr(suggestion.end);

    setValue(nextInputValue);
    setSelected(suggestion);
    setIndex(null);

    onChange(nextInputValue, nextInputValue.length);
  };

  const { onKeyDown, onKeyUp } = useKeyEvents({
    index,
    value,
    isSuggestionsVisible,
    setIndex,
    setIsSuggestionsVisible,
    suggestions,
    selectSuggestion,
    onChange,
    onSubmit,
  });

  const onClickOutside = () => {
    if (isSuggestionsVisible) {
      setIsSuggestionsVisible(false);
      onSuggestionSubmit();
    }
  };

  const onChangeInputValue = (event: ChangeEvent<HTMLInputElement>) => {
    const { value: valueN, selectionStart } = event.target;
    const hasValue = Boolean(valueN.trim());

    setValue(valueN);

    setInputIsPristine(false);
    setIndex(null);

    if (!kqlSyntax) {
      setQuery(valueN);
      return;
    }

    setIsSuggestionsVisible(hasValue);

    if (!hasValue) {
      onSubmit(valueN);
    }
    onChange(valueN, selectionStart!);
  };

  const onClickInput = (event: MouseEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    if (kqlSyntax) {
      event.stopPropagation();
      const { selectionStart } = event.target;
      onChange(value, selectionStart!);
    }
  };

  const onFocus = () => {
    if (kqlSyntax) {
      setIsSuggestionsVisible(true);
    }
  };

  const onClickSuggestion = (suggestion: QuerySuggestion) => {
    selectSuggestion(suggestion);
    if (inputRef.current) inputRef.current.focus();
  };

  const onMouseEnterSuggestion = (indexN: number) => {
    setIndex(indexN);
  };

  const onSuggestionSubmit = () => {
    if (
      lastSubmitted !== value &&
      selected &&
      (selected.type === 'value' || selected.text.trim() === ': *')
    ) {
      onSubmit(value);

      setLastSubmitted(value);
      setSelected(null);
    }
  };

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <span>
        <div data-test-subj={dataTestSubj} style={{ position: 'relative' }}>
          <EuiFieldSearch
            aria-label={ariaLabel}
            fullWidth
            style={
              kqlSyntax
                ? {
                    backgroundImage: 'none',
                  }
                : {}
            }
            placeholder={kqlSyntax ? KQL_PLACE_HOLDER : SIMPLE_SEARCH_PLACEHOLDER}
            inputRef={(node) => {
              if (node) {
                inputRef.current = node;
              }
            }}
            disabled={disabled}
            value={value}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            onChange={onChangeInputValue}
            onClick={onClickInput}
            autoComplete="off"
            spellCheck={false}
            append={<SearchType kqlSyntax={kqlSyntax} setKqlSyntax={setKqlSyntax} />}
          />

          {isLoading && (
            <EuiProgress
              size="xs"
              color="accent"
              position="absolute"
              style={{
                bottom: 0,
                top: 'initial',
              }}
            />
          )}
        </div>
        {kqlSyntax && (
          <Suggestions
            show={isSuggestionsVisible}
            suggestions={suggestions}
            index={index!}
            onClick={onClickSuggestion}
            onMouseEnter={onMouseEnterSuggestion}
            loadMore={loadMore}
          />
        )}
      </span>
    </EuiOutsideClickDetector>
  );
};
