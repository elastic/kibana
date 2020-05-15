/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { KeyboardEvent, ChangeEvent, MouseEvent, useState, useRef } from 'react';
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
}

export const Typeahead: React.FC<TypeaheadProps> = props => {
  const [state, setState] = useState<TypeaheadState>({
    isSuggestionsVisible: false,
    index: null,
    value: '',
    inputIsPristine: true,
    lastSubmitted: '',
  });

  const inputRef = useRef<HTMLInputElement>();

  // static getDerivedStateFromProps(props: TypeaheadProps, state: TypeaheadState) {
  //   if (state.inputIsPristine && props.initialValue) {
  //     return {
  //       value: props.initialValue,
  //     };
  //   }

  //   return null;
  // }

  const incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= props.suggestions.length) {
      nextIndex = 0;
    }
    setState({ ...state, index: nextIndex });
  };

  const decrementIndex = (currentIndex: number) => {
    let previousIndex: number | null = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }
    setState({ ...state, index: previousIndex });
  };

  const onKeyUp = (event: KeyboardEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    const { selectionStart } = event.target;
    const { value } = state;
    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        setState({ ...state, isSuggestionsVisible: true });
        props.onChange(value, selectionStart);
        break;
      case KEY_CODES.RIGHT:
        setState({ ...state, isSuggestionsVisible: true });
        props.onChange(value, selectionStart);
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
          setState({ ...state, isSuggestionsVisible: true, index: 0 });
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
        if (isSuggestionsVisible && props.suggestions[index!]) {
          selectSuggestion(props.suggestions[index!]);
        } else {
          setState({ ...state, isSuggestionsVisible: false });
          props.onSubmit(value);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();
        setState({ ...state, isSuggestionsVisible: false });
        break;
      case KEY_CODES.TAB:
        setState({ ...state, isSuggestionsVisible: false });
        break;
    }
  };

  const selectSuggestion = (suggestion: QuerySuggestion) => {
    const nextInputValue =
      state.value.substr(0, suggestion.start) +
      suggestion.text +
      state.value.substr(suggestion.end);

    setState({ ...state, value: nextInputValue, index: null });
    props.onChange(nextInputValue, nextInputValue.length);
  };

  const onClickOutside = () => {
    setState({ ...state, isSuggestionsVisible: false });
  };

  const onChangeInputValue = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, selectionStart } = event.target;
    const hasValue = Boolean(value.trim());
    setState({
      ...state,
      value,
      inputIsPristine: false,
      isSuggestionsVisible: hasValue,
      index: null,
    });

    if (!hasValue) {
      props.onSubmit(value);
    }
    props.onChange(value, selectionStart!);
  };

  const onClickInput = (event: MouseEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    const { selectionStart } = event.target;
    props.onChange(state.value, selectionStart!);
  };

  const onClickSuggestion = (suggestion: QuerySuggestion) => {
    selectSuggestion(suggestion);
    if (inputRef.current) inputRef.current.focus();
  };

  const onMouseEnterSuggestion = (index: number) => {
    setState({ ...state, index });
  };

  const onSubmit = () => {
    if (state.lastSubmitted !== state.value) {
      props.onSubmit(state.value);
      setState({ ...state, lastSubmitted: state.value });
    }
    setState({ ...state, isSuggestionsVisible: false });
  };

  return (
    <EuiOutsideClickDetector onOutsideClick={onClickOutside}>
      <>
        <div data-test-subj={props.dataTestSubj} style={{ position: 'relative' }}>
          <EuiFieldSearch
            aria-label={props.ariaLabel}
            fullWidth
            style={{
              backgroundImage: 'none',
            }}
            placeholder={i18n.translate('xpack.uptime.kueryBar.searchPlaceholder', {
              defaultMessage: 'Search monitor IDs, names, and protocol types...',
            })}
            inputRef={node => {
              if (node) {
                inputRef.current = node;
              }
            }}
            disabled={props.disabled}
            value={state.value}
            onKeyDown={onKeyDown}
            onKeyUp={onKeyUp}
            onBlur={onSubmit}
            onChange={onChangeInputValue}
            onClick={onClickInput}
            autoComplete="off"
            spellCheck={false}
          />

          {props.isLoading && (
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
          suggestions={props.suggestions}
          index={state.index!}
          onClick={onClickSuggestion}
          onMouseEnter={onMouseEnterSuggestion}
        />
      </>
    </EuiOutsideClickDetector>
  );
};
