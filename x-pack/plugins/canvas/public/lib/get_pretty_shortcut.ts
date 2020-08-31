/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const getPrettyShortcut = (shortcut: string): string => {
  if (!shortcut) {
    return '';
  }

  let result = shortcut.toUpperCase();
  result = result.replace(/command/i, '⌘');
  result = result.replace(/option/i, '⌥');
  result = result.replace(/left/i, '←');
  result = result.replace(/right/i, '→');
  result = result.replace(/up/i, '↑');
  result = result.replace(/down/i, '↓');
  result = result.replace(/plus/i, '+');
  result = result.replace(/minus/i, '-');

  return result;
};
