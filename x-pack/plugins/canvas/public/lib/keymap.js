/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';

// maps key for all OS's with optional modifiers
const getShortcuts = (shortcuts, modifiers = []) => {
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
  };
};

const refreshShortcut = { ...getShortcuts('r', ['alt']), help: 'Refresh workpad' };
const previousPageShortcut = { ...getShortcuts('[', ['alt']), help: 'Go to previous page' };
const nextPageShortcut = { ...getShortcuts(']', ['alt']), help: 'Go to next page' };
const deleteElementShortcuts = ['del', 'backspace'];
const groupShortcut = ['g'];
const ungroupShortcut = ['u'];
const fullscreentExitShortcut = ['esc'];

export const keymap = {
  ELEMENT: {
    displayName: 'Element controls',
    CUT: { ...getShortcuts('x', ['ctrl']), help: 'Cut' },
    COPY: { ...getShortcuts('c', ['ctrl']), help: 'Copy' },
    PASTE: { ...getShortcuts('v', ['ctrl']), help: 'Paste' },
    CLONE: { ...getShortcuts('d', ['ctrl']), help: 'Clone' },
    DELETE: {
      osx: deleteElementShortcuts,
      windows: deleteElementShortcuts,
      linux: deleteElementShortcuts,
      other: deleteElementShortcuts,
      help: 'Delete',
    },
    BRING_FORWARD: {
      ...getShortcuts('up', ['ctrl']),
      help: 'Bring to front',
    },
    BRING_TO_FRONT: {
      ...getShortcuts('up', ['ctrl', 'shift']),
      help: 'Bring forward',
    },
    SEND_BACKWARD: {
      ...getShortcuts('down', ['ctrl']),
      help: 'Send backward',
    },
    SEND_TO_BACK: {
      ...getShortcuts('down', ['ctrl', 'shift']),
      help: 'Send to back',
    },
    GROUP: {
      osx: groupShortcut,
      windows: groupShortcut,
      linux: groupShortcut,
      other: groupShortcut,
      help: 'Group',
    },
    UNGROUP: {
      osx: ungroupShortcut,
      windows: ungroupShortcut,
      linux: ungroupShortcut,
      other: ungroupShortcut,
      help: 'Ungroup',
    },
  },
  EDITOR: {
    displayName: 'Editor controls',
    UNDO: { ...getShortcuts('z', ['ctrl']), help: 'Undo last action' },
    REDO: { ...getShortcuts('z', ['ctrl', 'shift']), help: 'Redo last action' },
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    EDITING: { ...getShortcuts('e', ['alt']), help: 'Toggle edit mode' },
    GRID: { ...getShortcuts('g', ['alt']), help: 'Show grid' },
    REFRESH: refreshShortcut,
  },
  PRESENTATION: {
    displayName: 'Presentation controls',
    FULLSCREEN: { ...getShortcuts(['p', 'f'], ['alt']), help: 'Enter presentation mode' },
    FULLSCREEN_EXIT: { ...getShortcuts(fullscreentExitShortcut), help: 'Exit presentation mode' },
    PREV: mapValues(previousPageShortcut, (osShortcuts, key) =>
      key === 'help' ? osShortcuts : osShortcuts.concat(['backspace', 'left'])
    ),
    NEXT: mapValues(nextPageShortcut, (osShortcuts, key) =>
      key === 'help' ? osShortcuts : osShortcuts.concat(['space', 'right'])
    ),
    REFRESH: refreshShortcut,
  },
  EXPRESSION: {
    displayName: 'Expression controls',
    RUN: { ...getShortcuts('enter', ['ctrl']), help: 'Run whole expression' },
  },
};
