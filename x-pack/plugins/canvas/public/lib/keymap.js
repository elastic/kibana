/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';

// maps 'option' for mac and 'alt' for other OS
const getAltShortcuts = shortcuts => {
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
const getCtrlShortcuts = shortcuts => {
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

const refreshShortcut = { ...getAltShortcuts('r'), help: 'Refresh workpad' };
const previousPageShortcut = { ...getAltShortcuts('['), help: 'Go to previous page' };
const nextPageShortcut = { ...getAltShortcuts(']'), help: 'Go to next page' };
const deleteElementShortcuts = ['del', 'backspace'];
const groupShortcut = ['g'];
const ungroupShortcut = ['u'];
const fullscreentExitShortcut = ['esc'];

export const keymap = {
  ELEMENT: {
    displayName: 'Element controls',
    COPY: { ...getCtrlShortcuts('c'), help: 'Copy' },
    CLONE: { ...getCtrlShortcuts('d'), help: 'Clone' },
    CUT: { ...getCtrlShortcuts('x'), help: 'Cut' },
    PASTE: { ...getCtrlShortcuts('v'), help: 'Paste' },
    DELETE: {
      osx: deleteElementShortcuts,
      windows: deleteElementShortcuts,
      linux: deleteElementShortcuts,
      other: deleteElementShortcuts,
      help: 'Delete',
    },
    BRING_FORWARD: {
      ...getCtrlShortcuts('up'),
      help: 'Send forward',
    },
    BRING_TO_FRONT: {
      ...getCtrlShortcuts('shift+up'),
      help: 'Send to front',
    },
    SEND_BACKWARD: {
      ...getCtrlShortcuts('down'),
      help: 'Send backward',
    },
    SEND_TO_BACK: {
      ...getCtrlShortcuts('shift+down'),
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
    UNDO: { ...getCtrlShortcuts('z'), help: 'Undo last action' },
    REDO: { ...getCtrlShortcuts('shift+z'), help: 'Redo last action' },
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    EDITING: { ...getAltShortcuts('e'), help: 'Toggle edit mode' },
    GRID: { ...getAltShortcuts('g'), help: 'Show grid' },
    REFRESH: refreshShortcut,
  },
  PRESENTATION: {
    displayName: 'Presentation mode',
    FULLSCREEN: { ...getAltShortcuts(['p', 'f']), help: 'Enter presentation mode' },
    FULLSCREEN_EXIT: {
      osx: fullscreentExitShortcut,
      windows: fullscreentExitShortcut,
      linux: fullscreentExitShortcut,
      other: fullscreentExitShortcut,
      help: 'Exit presentation mode',
    },
    PREV: mapValues(previousPageShortcut, (osShortcuts, key) =>
      key === 'help' ? osShortcuts : osShortcuts.concat(['backspace', 'left'])
    ),
    NEXT: mapValues(nextPageShortcut, (osShortcuts, key) =>
      key === 'help' ? osShortcuts : osShortcuts.concat(['space', 'right'])
    ),
    REFRESH: refreshShortcut,
  },
};
