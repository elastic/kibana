/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ChangeEvent, KeyboardEvent } from 'react';
import * as React from 'react';
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

interface Props {
  value: string;
  index: number | null;
  isSuggestionsVisible: boolean;
  setIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setIsSuggestionsVisible: React.Dispatch<React.SetStateAction<boolean>>;
  suggestions: QuerySuggestion[];
  selectSuggestion: (suggestion: QuerySuggestion) => void;
  onChange: (inputValue: string, selectionStart: number | null) => void;
  onSubmit: (inputValue: string) => void;
}

export const useKeyEvents = ({
  value,
  index,
  isSuggestionsVisible,
  setIndex,
  setIsSuggestionsVisible,
  suggestions,
  selectSuggestion,
  onChange,
  onSubmit,
}: Props) => {
  const incrementIndex = (currentIndex: number) => {
    let nextIndex = currentIndex + 1;
    if (currentIndex === null || nextIndex >= suggestions.length) {
      nextIndex = 0;
    }

    setIndex(nextIndex);
  };

  const decrementIndex = (currentIndex: number) => {
    let previousIndex: number | null = currentIndex - 1;
    if (previousIndex < 0) {
      previousIndex = null;
    }
    setIndex(previousIndex);
  };

  const onKeyUp = (event: KeyboardEvent<HTMLInputElement> & ChangeEvent<HTMLInputElement>) => {
    const { selectionStart } = event.target;
    switch (event.keyCode) {
      case KEY_CODES.LEFT:
        setIsSuggestionsVisible(true);
        onChange(value, selectionStart);
        break;
      case KEY_CODES.RIGHT:
        setIsSuggestionsVisible(true);
        onChange(value, selectionStart);
        break;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.keyCode) {
      case KEY_CODES.DOWN:
        event.preventDefault();
        if (isSuggestionsVisible) {
          incrementIndex(index!);
        } else {
          setIndex(0);
          setIsSuggestionsVisible(true);
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
          setIsSuggestionsVisible(false);

          onSubmit(value);
        }
        break;
      case KEY_CODES.ESC:
        event.preventDefault();
        setIsSuggestionsVisible(false);

        break;
      case KEY_CODES.TAB:
        setIsSuggestionsVisible(false);

        break;
    }
  };

  return { onKeyUp, onKeyDown };
};
