/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Provides an `onKeyDown` handler that automatically inserts matching pairs.
 * Specifically, it does the following:
 *
 * 1. If we don't have a multi-character selection, and the key is a closer,
 *    and the character in front of the cursor is the same, simply move the
 *    cursor forward.
 * 2. If the key is an opener, insert the opener at the beginning of the
 *    selection, and the closer at the end of the selection, and move the
 *    selection forward.
 * 3. If we don't have a multi-character selection, and the backspace is hit,
 *    and the characters before and after the cursor correspond to a pair,
 *    remove both characters and move the cursor backward.
 */
export const matchPairsProvider = ({
  pairs = ['()', '[]', '{}', `''`, '""'],
  setValue,
  setSelection,
}) => {
  const openers = pairs.map(pair => pair[0]);
  const closers = pairs.map(pair => pair[1]);
  return e => {
    const { target, key } = e;
    const { value, selectionStart, selectionEnd } = target;
    if (
      selectionStart === selectionEnd &&
      closers.includes(key) &&
      value.charAt(selectionEnd) === key
    ) {
      // 1. (See above)
      e.preventDefault();
      setSelection({ start: selectionStart + 1, end: selectionEnd + 1 });
    } else if (openers.includes(key)) {
      // 2. (See above)
      e.preventDefault();
      setValue(
        value.substr(0, selectionStart) +
          key +
          value.substring(selectionStart, selectionEnd) +
          closers[openers.indexOf(key)] +
          value.substr(selectionEnd)
      );
      setSelection({ start: selectionStart + 1, end: selectionEnd + 1 });
    } else if (
      selectionStart === selectionEnd &&
      key === 'Backspace' &&
      !e.metaKey &&
      pairs.includes(value.substr(selectionEnd - 1, 2))
    ) {
      // 3. (See above)
      e.preventDefault();
      setValue(value.substr(0, selectionEnd - 1) + value.substr(selectionEnd + 1));
      setSelection({ start: selectionStart - 1, end: selectionEnd - 1 });
    }
  };
};
