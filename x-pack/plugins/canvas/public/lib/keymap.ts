/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';

// map for shortcuts per operating system
interface OSKeymap {
  osx: string[];
  windows: string[];
  linux: string[];
  other: string[];
}

// maps 'option' for mac and 'alt' for other OS
const getAltShortcuts = (shortcuts: string | string[]): OSKeymap => {
  if (!Array.isArray(shortcuts)) {
    shortcuts = [shortcuts];
  }
  const optionShortcuts = shortcuts.map(shortcut => `option+${shortcut}`);
  const altShortcuts = shortcuts.map(shortcut => `alt+${shortcut}`);

  return {
    osx: optionShortcuts,
    windows: altShortcuts,
    linux: altShortcuts,
    other: altShortcuts,
  };
};

// maps 'command' for mac and 'ctrl' for other OS
const getCtrlShortcuts = (shortcuts: string | string[]): OSKeymap => {
  if (!Array.isArray(shortcuts)) {
    shortcuts = [shortcuts];
  }
  const cmdShortcuts = shortcuts.map(shortcut => `command+${shortcut}`);
  const ctrlShortcuts = shortcuts.map(shortcut => `ctrl+${shortcut}`);

  return {
    osx: cmdShortcuts,
    windows: ctrlShortcuts,
    linux: ctrlShortcuts,
    other: ctrlShortcuts,
  };
};

const refreshShortcut = getAltShortcuts('r');
const previousPageShortcut = getAltShortcuts('[');
const nextPageShortcut = getAltShortcuts(']');

export const keymap = {
  EDITOR: {
    UNDO: getCtrlShortcuts('z'),
    REDO: getCtrlShortcuts('shift+z'),
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    FULLSCREEN: getAltShortcuts(['p', 'f']),
    FULLSCREEN_EXIT: ['escape'],
    EDITING: getAltShortcuts('e'),
    GRID: getAltShortcuts('g'),
    REFRESH: refreshShortcut,
  },
  ELEMENT: {
    COPY: getCtrlShortcuts('c'),
    CLONE: getCtrlShortcuts('d'),
    CUT: getCtrlShortcuts('x'),
    PASTE: getCtrlShortcuts('v'),
    DELETE: ['del', 'backspace'],
    BRING_FORWARD: getCtrlShortcuts('up'),
    SEND_BACKWARD: getCtrlShortcuts('down'),
    BRING_TO_FRONT: getCtrlShortcuts('shift+up'),
    SEND_TO_BACK: getCtrlShortcuts('shift+down'),
  },
  PRESENTATION: {
    PREV: mapValues(previousPageShortcut, osShortcuts => osShortcuts.concat(['backspace', 'left'])),
    NEXT: mapValues(nextPageShortcut, osShortcuts => osShortcuts.concat(['space', 'right'])),
    REFRESH: refreshShortcut,
  },
};
