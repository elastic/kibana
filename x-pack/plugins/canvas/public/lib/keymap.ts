/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';

export interface ShortcutMap {
  osx: string[];
  windows: string[];
  linux: string[];
  other: string[];
  help: string;
}

export interface ShortcutNameSpace {
  displayName: string;
  [shortcut: string]: string | ShortcutMap;
}

interface KeyMap {
  [category: string]: ShortcutNameSpace;
}
type Modifier = 'ctrl' | 'command' | 'shift' | 'alt' | 'option';

// maps key for all OS's with optional modifiers
const getShortcuts = (
  shortcuts: string | string[],
  { modifiers = [], help }: { modifiers?: Modifier | Modifier[]; help: string }
): ShortcutMap => {
  // normalize shortcut values
  if (!Array.isArray(shortcuts)) {
    shortcuts = [shortcuts];
  }

  // normalize modifier values
  if (!Array.isArray(modifiers)) {
    modifiers = [modifiers];
  }

  let macShortcuts = shortcuts;

  // handle shift modifier
  if (modifiers.includes('shift')) {
    macShortcuts = shortcuts.map(shortcut => `shift+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `shift+${shortcut}`);
  }

  // handle alt modifier
  if (modifiers.includes('alt') || modifiers.includes('option')) {
    macShortcuts = shortcuts.map(shortcut => `option+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `alt+${shortcut}`);
  }

  // handle ctrl modifier
  if (modifiers.includes('ctrl') || modifiers.includes('command')) {
    macShortcuts = shortcuts.map(shortcut => `command+${shortcut}`);
    shortcuts = shortcuts.map(shortcut => `ctrl+${shortcut}`);
  }

  return {
    osx: macShortcuts,
    windows: shortcuts,
    linux: shortcuts,
    other: shortcuts,
    help,
  };
};

const refreshShortcut = getShortcuts('r', { modifiers: 'alt', help: 'Refresh workpad' });
const previousPageShortcut = getShortcuts('[', { modifiers: 'alt', help: 'Go to previous page' });
const nextPageShortcut = getShortcuts(']', { modifiers: 'alt', help: 'Go to next page' });

export const keymap: KeyMap = {
  ELEMENT: {
    displayName: 'Element controls',
    CUT: getShortcuts('x', { modifiers: 'ctrl', help: 'Cut' }),
    COPY: getShortcuts('c', { modifiers: 'ctrl', help: 'Copy' }),
    PASTE: getShortcuts('v', { modifiers: 'ctrl', help: 'Paste' }),
    CLONE: getShortcuts('d', { modifiers: 'ctrl', help: 'Clone' }),
    DELETE: getShortcuts(['del', 'backspace'], { help: 'Delete' }),
    BRING_FORWARD: getShortcuts('up', { modifiers: 'ctrl', help: 'Bring to front' }),
    BRING_TO_FRONT: getShortcuts('up', { modifiers: ['ctrl', 'shift'], help: 'Bring forward' }),
    SEND_BACKWARD: getShortcuts('down', { modifiers: 'ctrl', help: 'Send backward' }),
    SEND_TO_BACK: getShortcuts('down', { modifiers: ['ctrl', 'shift'], help: 'Send to back' }),
    GROUP: getShortcuts('g', { help: 'Group' }),
    UNGROUP: getShortcuts('u', { help: 'Ungroup' }),
  },
  EXPRESSION: {
    displayName: 'Expression controls',
    RUN: getShortcuts('enter', { modifiers: 'ctrl', help: 'Run whole expression' }),
  },
  EDITOR: {
    displayName: 'Editor controls',
    // added for documentation purposes, not handled by `react-shortcuts`
    MULTISELECT: getShortcuts('click', { modifiers: 'shift', help: 'Select multiple elements' }),
    // added for documentation purposes, not handled by `react-shortcuts`
    RESIZE_FROM_CENTER: getShortcuts('drag', {
      modifiers: 'alt',
      help: 'Resize from center',
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    IGNORE_SNAP: getShortcuts('drag', {
      modifiers: 'ctrl',
      help: 'Move, resize, and rotate without snapping',
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    SELECT_BEHIND: getShortcuts('click', {
      modifiers: 'ctrl',
      help: 'Select element below',
    }),
    UNDO: getShortcuts('z', { modifiers: 'ctrl', help: 'Undo last action' }),
    REDO: getShortcuts('z', { modifiers: ['ctrl', 'shift'], help: 'Redo last action' }),
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    EDITING: getShortcuts('e', { modifiers: 'alt', help: 'Toggle edit mode' }),
    GRID: getShortcuts('g', { modifiers: 'alt', help: 'Show grid' }),
    REFRESH: refreshShortcut,
  },
  PRESENTATION: {
    displayName: 'Presentation controls',
    FULLSCREEN: getShortcuts(['f', 'p'], { modifiers: 'alt', help: 'Enter presentation mode' }),
    FULLSCREEN_EXIT: getShortcuts('esc', { help: 'Exit presentation mode' }),
    PREV: mapValues(previousPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'backspace' and 'left' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['backspace', 'left'])
    ),
    NEXT: mapValues(nextPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'space' and 'right' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['space', 'right'])
    ),
    REFRESH: refreshShortcut,
    PAGE_CYCLE_TOGGLE: getShortcuts('p', { help: 'Toggle page cycling' }),
  },
};
