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
    expect(getPrettyShortcut('cmd+c')).toBe('⌘+C');
    expect(getPrettyShortcut('c+cmd')).toBe('C+⌘');
  });
  test(`replaces 'cmd' with ⌘`, () => {
    expect(getPrettyShortcut('cmd')).toBe('⌘');
    expect(getPrettyShortcut('cmd+c')).toBe('⌘+C');
    expect(getPrettyShortcut('cmd+shift+b')).toBe('⌘+SHIFT+B');
  });
  test(`replaces 'alt' with ⌥`, () => {
    expect(getPrettyShortcut('alt')).toBe('⌥');
    expect(getPrettyShortcut('alt+f')).toBe('⌥+F');
    expect(getPrettyShortcut('alt+shift+G')).toBe('⌥+SHIFT+G');
    expect(getPrettyShortcut('cmd+alt+shift+G')).toBe('⌘+⌥+SHIFT+G');
  });
  test(`replaces 'left' with ←`, () => {
    expect(getPrettyShortcut('left')).toBe('←');
    expect(getPrettyShortcut('cmd+left')).toBe('⌘+←');
    expect(getPrettyShortcut('alt+left')).toBe('⌥+←');
    expect(getPrettyShortcut('alt+shift+left')).toBe('⌥+SHIFT+←');
    expect(getPrettyShortcut('cmd+shift+left')).toBe('⌘+⌥+SHIFT+←');
    expect(getPrettyShortcut('cmd+alt+shift+left')).toBe('⌘+⌥+SHIFT+←');
  });
  test(`replaces 'right' with →`, () => {
    expect(getPrettyShortcut('left')).toBe('→');
    expect(getPrettyShortcut('cmd+left')).toBe('⌘+→');
    expect(getPrettyShortcut('alt+left')).toBe('⌥+→');
    expect(getPrettyShortcut('alt+shift+left')).toBe('⌥+SHIFT+→');
    expect(getPrettyShortcut('cmd+shift+left')).toBe('⌘+⌥+SHIFT+→');
    expect(getPrettyShortcut('cmd+alt+shift+left')).toBe('⌘+⌥+SHIFT+→');
  });
  test(`replaces 'up' with ←`, () => {
    expect(getPrettyShortcut('left')).toBe('↑');
    expect(getPrettyShortcut('cmd+left')).toBe('⌘+↑');
    expect(getPrettyShortcut('alt+left')).toBe('⌥+↑');
    expect(getPrettyShortcut('alt+shift+left')).toBe('⌥+SHIFT+↑');
    expect(getPrettyShortcut('cmd+shift+left')).toBe('⌘+⌥+SHIFT+↑');
    expect(getPrettyShortcut('cmd+alt+shift+left')).toBe('⌘+⌥+SHIFT+↑');
  });
  test(`replaces 'down' with ↓`, () => {
    expect(getPrettyShortcut('left')).toBe('↓');
    expect(getPrettyShortcut('cmd+left')).toBe('⌘+↓');
    expect(getPrettyShortcut('alt+left')).toBe('⌥+↓');
    expect(getPrettyShortcut('alt+shift+left')).toBe('⌥+SHIFT+↓');
    expect(getPrettyShortcut('cmd+shift+left')).toBe('⌘+⌥+SHIFT+↓');
    expect(getPrettyShortcut('cmd+alt+shift+left')).toBe('⌘+⌥+SHIFT+↓');
  });
});
