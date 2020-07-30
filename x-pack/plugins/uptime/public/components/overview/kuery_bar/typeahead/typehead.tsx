/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { KeyboardEvent, ChangeEvent, MouseEvent, useState, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldSearch, EuiProgress, EuiOutsideClickDetector } from '@elastic/eui';
import { Suggestions } from './suggestions';
import { QuerySuggestion } from '../../../../../../../../src/plugins/data/public';

const KEY_CODES = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40,
  ENTER: 13,
  ESC: 27,
  TAB: 9,
};

interface TypeaheadState {
  isSuggestionsVisible: boolean;
  index: number | null;
  value: string;
  inputIsPristine: boolean;
  lastSubmitted: string;
  selected: QuerySuggestion | null;
}

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
  const [state, setState] = useState<TypeaheadState>({
    isSuggestionsVisible: false,
    index: null,
    value: '',
    inputIsPristine: true,
    lastSubmitted: '',
    selected: null,
  });

  const inputRef = useRef<HTMLInputElement>();

  useEffect(() => {
    if (state.inputIsPristine && initialValue) {
      setState((prevState) => ({
        ...prevState,
        value: initialValue,
      }));
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= suggestions.length) {
      nextIndex = 0;
    }

    setState((prevState) => ({
      ...prevState,
      index: nextIndex,
    }));
  };

  const decrementIndex = (currentIndex: number) => {
    let previousIndex: number | null = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }

    setState((prevState) => ({
      ...prevState,
      index: previousIndex,
    }));
  };

  const onKeyUp = (event: KeyboardEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    const { selectionStart } = event.target;
    const { value } = state;
    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        setState((prevState) => ({
          ...prevState,
          isSuggestionsVisible: true,
        }));
        onChange(value, selectionStart);
        break;
      case KEY_CODES.RIGHT:
        setState((prevState) => ({
          ...prevState,
          isSuggestionsVisible: true,
        }));
        onChange(value, selectionStart);
        break;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const { isSuggestionsVisible, index, value } = state;
    switch (event.keyCode) {
      case KEY_CODES.DOWN:
        event.preventDefault();
        if (isSuggestionsVisible) {
          incrementIndex(index!);
        } else {
          setState((prevState) => ({
            ...prevState,
            isSuggestionsVisible: true,
            index: 0,
          }));
        }
        break;
      case KEY_CODES.UP:
        event.preventDefault();
        if (isSuggestionsVisible) {
          decrementIndex(index!);
        }
        break;
      case KEY_CODES.ENTER:
        event.preventDefault();
        if (isSuggestionsVisible && suggestions[index!]) {
          selectSuggestion(suggestions[index!]);
        } else {
          setState((prevState) => ({
            ...prevState,
            isSuggestionsVisible: false,
          }));

          onSubmit(value);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();

        setState((prevState) => ({
          ...prevState,
          isSuggestionsVisible: false,
        }));

        break;
      case KEY_CODES.TAB:
        setState((prevState) => ({
          ...prevState,
          isSuggestionsVisible: false,
        }));
        break;
    }
  };

  const selectSuggestion = (suggestion: QuerySuggestion) => {
    const nextInputValue =
      state.value.substr(0, suggestion.start) +
      suggestion.text +
      state.value.substr(suggestion.end);

    setState((prevState) => ({
      ...prevState,
      value: nextInputValue,
      index: null,
      selected: suggestion,
    }));

    onChange(nextInputValue, nextInputValue.length);
  };

  const onClickOutside = () => {
    if (state.isSuggestionsVisible) {
      setState((prevState) => ({
        ...prevState,
        isSuggestionsVisible: false,
      }));

      onSuggestionSubmit();
    }
  };

  const onChangeInputValue = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = event.target;
    const hasValue = Boolean(value.trim());

    setState((prevState) => ({
      ...prevState,
      value,
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null,
    }));

    if (!hasValue) {
      onSubmit(value);
    }
    onChange(value, selectionStart!);
  };

  const onClickInput = (event: MouseEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const { selectionStart } = event.target;
    onChange(state.value, selectionStart!);
  };

  const onFocus = () => {
    setState((prevState) => ({
      ...prevState,
      isSuggestionsVisible: true,
    }));
  };

  const onClickSuggestion = (suggestion: QuerySuggestion) => {
    selectSuggestion(suggestion);
    if (inputRef.current) inputRef.current.focus();
  };

  const onMouseEnterSuggestion = (index: number) => {
    setState({ ...state, index });

    setState((prevState) => ({
      ...prevState,
      index,
    }));
  };

  const onSuggestionSubmit = () => {
    const { value, lastSubmitted, selected } = state;

    if (
      lastSubmitted !== value &&
      selected &&
      (selected.type === 'value' || selected.text.trim() === ': *')
    ) {
      onSubmit(value);

      setState((prevState) => ({
        ...prevState,
        lastSubmitted: value,
        selected: null,
      }));
    }
  };

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <span>
        <div data-test-subj={dataTestSubj} style={{ position: 'relative' }}>
          <EuiFieldSearch
            aria-label={ariaLabel}
            fullWidth
            style={{
              backgroundImage: 'none',
            }}
            placeholder={i18n.translate('xpack.uptime.kueryBar.searchPlaceholder', {
              defaultMessage: 'Search monitor IDs, names, and protocol types...',
            })}
            inputRef={(node) => {
              if (node) {
                inputRef.current = node;
              }
            }}
            disabled={disabled}
            value={state.value}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onFocus={onFocus}
            onChange={onChangeInputValue}
            onClick={onClickInput}
            autoComplete="off"
            spellCheck={false}
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

        <Suggestions
          show={state.isSuggestionsVisible}
          suggestions={suggestions}
          index={state.index!}
          onClick={onClickSuggestion}
          onMouseEnter={onMouseEnterSuggestion}
          loadMore={loadMore}
        />
      </span>
    </EuiOutsideClickDetector>
  );
};
