/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

interface TypeaheadProps {
  onChange: (inputValue: string, selectionStart: number) => void;
  onSubmit: (inputValue: string) => void;
  loadMore: () => void;
  suggestions: unknown[];
  queryExample: string;
  initialValue?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

export class Typeahead extends React.Component<TypeaheadProps> {
  incrementIndex(currentIndex: any): void;

  decrementIndex(currentIndex: any): void;

  onKeyUp(event: any): void;

  onKeyDown(event: any): void;

  selectSuggestion(suggestion: any): void;

  onClickOutside(): void;

  onChangeInputValue(event: any): void;

  onClickInput(event: any): void;

  onClickSuggestion(suggestion: any): void;

  onMouseEnterSuggestion(index: any): void;

  onSubmit(): void;

  render(): any;

  loadMore(): void;
}
