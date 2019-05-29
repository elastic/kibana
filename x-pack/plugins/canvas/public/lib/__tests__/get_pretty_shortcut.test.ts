/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getPrettyShortcut } from '../get_pretty_shortcut';

describe('getPrettyShortcut', () => {
  test('uppercases shortcuts', () => {
    expect(getPrettyShortcut('g')).toBe('G');
    expect(getPrettyShortcut('shift+click')).toBe('SHIFT+CLICK');
    expect(getPrettyShortcut('backspace')).toBe('BACKSPACE');
  });
  test('preserves shortcut order', () => {
    expect(getPrettyShortcut('command+c')).toBe('⌘+C');
    expect(getPrettyShortcut('c+command')).toBe('C+⌘');
  });
  test(`replaces 'command' with ⌘`, () => {
    expect(getPrettyShortcut('command')).toBe('⌘');
    expect(getPrettyShortcut('command+c')).toBe('⌘+C');
    expect(getPrettyShortcut('command+shift+b')).toBe('⌘+SHIFT+B');
  });
  test(`replaces 'option' with ⌥`, () => {
    expect(getPrettyShortcut('option')).toBe('⌥');
    expect(getPrettyShortcut('option+f')).toBe('⌥+F');
    expect(getPrettyShortcut('option+shift+G')).toBe('⌥+SHIFT+G');
    expect(getPrettyShortcut('command+option+shift+G')).toBe('⌘+⌥+SHIFT+G');
  });
  test(`replaces 'left' with ←`, () => {
    expect(getPrettyShortcut('left')).toBe('←');
    expect(getPrettyShortcut('command+left')).toBe('⌘+←');
    expect(getPrettyShortcut('option+left')).toBe('⌥+←');
    expect(getPrettyShortcut('option+shift+left')).toBe('⌥+SHIFT+←');
    expect(getPrettyShortcut('command+shift+left')).toBe('⌘+SHIFT+←');
    expect(getPrettyShortcut('command+option+shift+left')).toBe('⌘+⌥+SHIFT+←');
  });
  test(`replaces 'right' with →`, () => {
    expect(getPrettyShortcut('right')).toBe('→');
    expect(getPrettyShortcut('command+right')).toBe('⌘+→');
    expect(getPrettyShortcut('option+right')).toBe('⌥+→');
    expect(getPrettyShortcut('option+shift+right')).toBe('⌥+SHIFT+→');
    expect(getPrettyShortcut('command+shift+right')).toBe('⌘+SHIFT+→');
    expect(getPrettyShortcut('command+option+shift+right')).toBe('⌘+⌥+SHIFT+→');
  });
  test(`replaces 'up' with ←`, () => {
    expect(getPrettyShortcut('up')).toBe('↑');
    expect(getPrettyShortcut('command+up')).toBe('⌘+↑');
    expect(getPrettyShortcut('option+up')).toBe('⌥+↑');
    expect(getPrettyShortcut('option+shift+up')).toBe('⌥+SHIFT+↑');
    expect(getPrettyShortcut('command+shift+up')).toBe('⌘+SHIFT+↑');
    expect(getPrettyShortcut('command+option+shift+up')).toBe('⌘+⌥+SHIFT+↑');
  });
  test(`replaces 'down' with ↓`, () => {
    expect(getPrettyShortcut('down')).toBe('↓');
    expect(getPrettyShortcut('command+down')).toBe('⌘+↓');
    expect(getPrettyShortcut('option+down')).toBe('⌥+↓');
    expect(getPrettyShortcut('option+shift+down')).toBe('⌥+SHIFT+↓');
    expect(getPrettyShortcut('command+shift+down')).toBe('⌘+SHIFT+↓');
    expect(getPrettyShortcut('command+option+shift+down')).toBe('⌘+⌥+SHIFT+↓');
  });
});
