/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldSearch, EuiOutsideClickDetector, EuiPanel } from '@elastic/eui';
import React from 'react';
import { QuerySuggestion } from '@kbn/unified-search-plugin/public';
import { euiStyled } from '@kbn/kibana-react-plugin/common';
import { composeStateUpdaters } from '../../utils/typed_react';
import { SuggestionItem } from './suggestion_item';

interface AutocompleteFieldProps {
  isLoadingSuggestions: boolean;
  isValid: boolean;
  loadSuggestions: (value: string, cursorPosition: number, maxCount?: number) => void;
  onSubmit?: (value: string) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  suggestions: QuerySuggestion[];
  value: string;
  disabled?: boolean;
  autoFocus?: boolean;
  'aria-label'?: string;
}

interface AutocompleteFieldState {
  areSuggestionsVisible: boolean;
  isFocused: boolean;
  selectedIndex: number | null;
}

export class AutocompleteField extends React.Component<
  AutocompleteFieldProps,
  AutocompleteFieldState
> {
  public readonly state: AutocompleteFieldState = {
    areSuggestionsVisible: false,
    isFocused: false,
    selectedIndex: null,
  };

  private inputElement: HTMLInputElement | null = null;

  public render() {
    const {
      suggestions,
      isLoadingSuggestions,
      isValid,
      placeholder,
      value,
      disabled,
      'aria-label': ariaLabel,
    } = this.props;
    const { areSuggestionsVisible, selectedIndex } = this.state;

    return (
      <EuiOutsideClickDetector onOutsideClick={this.handleBlur}>
        <AutocompleteContainer>
          <EuiFieldSearch
            fullWidth
            disabled={disabled}
            inputRef={this.handleChangeInputRef}
            isLoading={isLoadingSuggestions}
            isInvalid={!isValid}
            onChange={this.handleChange}
            onFocus={this.handleFocus}
            onKeyDown={this.handleKeyDown}
            onKeyUp={this.handleKeyUp}
            onSearch={this.submit}
            placeholder={placeholder}
            value={value}
            aria-label={ariaLabel}
            data-test-subj="infraSearchField"
          />
          {areSuggestionsVisible && !isLoadingSuggestions && suggestions.length > 0 ? (
            <SuggestionsPanel>
              {suggestions.map((suggestion, suggestionIndex) => (
                <SuggestionItem
                  key={suggestion.text}
                  suggestion={suggestion}
                  isSelected={suggestionIndex === selectedIndex}
                  onMouseEnter={this.selectSuggestionAt(suggestionIndex)}
                  onClick={this.applySuggestionAt(suggestionIndex)}
                />
              ))}
            </SuggestionsPanel>
          ) : null}
        </AutocompleteContainer>
      </EuiOutsideClickDetector>
    );
  }

  public componentDidMount() {
    if (this.inputElement && this.props.autoFocus) {
      this.inputElement.focus();
    }
  }

  public componentDidUpdate(prevProps: AutocompleteFieldProps) {
    const hasNewValue = prevProps.value !== this.props.value;
    const hasNewSuggestions = prevProps.suggestions !== this.props.suggestions;

    if (hasNewValue) {
      this.updateSuggestions();
    }

    if (hasNewValue && this.props.value === '') {
      this.submit();
    }

    if (hasNewSuggestions && this.state.isFocused) {
      this.showSuggestions();
    }
  }

  private handleChangeInputRef = (element: HTMLInputElement | null) => {
    this.inputElement = element;
  };

  private handleChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.changeValue(evt.currentTarget.value);
  };

  private handleKeyDown = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    const { suggestions } = this.props;

    switch (evt.key) {
      case 'ArrowUp':
        evt.preventDefault();
        if (suggestions.length > 0) {
          this.setState(
            composeStateUpdaters(withSuggestionsVisible, withPreviousSuggestionSelected)
          );
        }
        break;
      case 'ArrowDown':
        evt.preventDefault();
        if (suggestions.length > 0) {
          this.setState(composeStateUpdaters(withSuggestionsVisible, withNextSuggestionSelected));
        } else {
          this.updateSuggestions();
        }
        break;
      case 'Enter':
        evt.preventDefault();
        if (this.state.selectedIndex !== null) {
          this.applySelectedSuggestion();
        } else {
          this.submit();
        }
        break;
      case 'Escape':
        evt.preventDefault();
        this.setState(withSuggestionsHidden);
        break;
    }
  };

  private handleKeyUp = (evt: React.KeyboardEvent<HTMLInputElement>) => {
    switch (evt.key) {
      case 'ArrowLeft':
      case 'ArrowRight':
      case 'Home':
      case 'End':
        this.updateSuggestions();
        break;
    }
  };

  private handleFocus = () => {
    this.setState(composeStateUpdaters(withSuggestionsVisible, withFocused));
  };

  private handleBlur = () => {
    this.setState(composeStateUpdaters(withSuggestionsHidden, withUnfocused));
  };

  private selectSuggestionAt = (index: number) => () => {
    this.setState(withSuggestionAtIndexSelected(index));
  };

  private applySelectedSuggestion = () => {
    if (this.state.selectedIndex !== null) {
      this.applySuggestionAt(this.state.selectedIndex)();
    }
  };

  private applySuggestionAt = (index: number) => () => {
    const { value, suggestions } = this.props;
    const selectedSuggestion = suggestions[index];

    if (!selectedSuggestion) {
      return;
    }

    const newValue =
      value.substr(0, selectedSuggestion.start) +
      selectedSuggestion.text +
      value.substr(selectedSuggestion.end);

    this.setState(withSuggestionsHidden);
    this.changeValue(newValue);
    this.focusInputElement();
  };

  private changeValue = (value: string) => {
    const { onChange } = this.props;

    if (onChange) {
      onChange(value);
    }
  };

  private focusInputElement = () => {
    if (this.inputElement) {
      this.inputElement.focus();
    }
  };

  private showSuggestions = () => {
    this.setState(withSuggestionsVisible);
  };

  private submit = () => {
    const { isValid, onSubmit, value } = this.props;

    if (isValid && onSubmit) {
      onSubmit(value);
    }

    this.setState(withSuggestionsHidden);
  };

  private updateSuggestions = () => {
    const inputCursorPosition = this.inputElement ? this.inputElement.selectionStart || 0 : 0;
    this.props.loadSuggestions(this.props.value, inputCursorPosition, 200);
  };
}

const withPreviousSuggestionSelected = (
  state: AutocompleteFieldState,
  props: AutocompleteFieldProps
): AutocompleteFieldState => ({
  ...state,
  selectedIndex:
    props.suggestions.length === 0
      ? null
      : state.selectedIndex !== null
      ? (state.selectedIndex + props.suggestions.length - 1) % props.suggestions.length
      : Math.max(props.suggestions.length - 1, 0),
});

const withNextSuggestionSelected = (
  state: AutocompleteFieldState,
  props: AutocompleteFieldProps
): AutocompleteFieldState => ({
  ...state,
  selectedIndex:
    props.suggestions.length === 0
      ? null
      : state.selectedIndex !== null
      ? (state.selectedIndex + 1) % props.suggestions.length
      : 0,
});

const withSuggestionAtIndexSelected =
  (suggestionIndex: number) =>
  (state: AutocompleteFieldState, props: AutocompleteFieldProps): AutocompleteFieldState => ({
    ...state,
    selectedIndex:
      props.suggestions.length === 0
        ? null
        : suggestionIndex >= 0 && suggestionIndex < props.suggestions.length
        ? suggestionIndex
        : 0,
  });

const withSuggestionsVisible = (state: AutocompleteFieldState) => ({
  ...state,
  areSuggestionsVisible: true,
});

const withSuggestionsHidden = (state: AutocompleteFieldState) => ({
  ...state,
  areSuggestionsVisible: false,
  selectedIndex: null,
});

const withFocused = (state: AutocompleteFieldState) => ({
  ...state,
  isFocused: true,
});

const withUnfocused = (state: AutocompleteFieldState) => ({
  ...state,
  isFocused: false,
});

const AutocompleteContainer = euiStyled.div`
  position: relative;
`;

const SuggestionsPanel = euiStyled(EuiPanel).attrs(() => ({
  paddingSize: 'none',
  hasShadow: true,
}))`
  position: absolute;
  width: 100%;
  margin-top: 2px;
  overflow-x: hidden;
  overflow-y: scroll;
  z-index: ${(props) => props.theme.eui.euiZLevel1};
  max-height: 322px;
`;
