/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mapValues } from 'lodash';

import { ShortcutMap, ShortcutNameSpace } from '../../types/shortcuts';
import { ShortcutStrings as strings } from '../../i18n/shortcuts';

const shortcutHelp = strings.getShortcutHelp();
const namespaceDisplayNames = strings.getNamespaceDisplayNames();

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

  let macShortcuts = [...shortcuts];

  // handle shift modifier
  if (modifiers.includes('shift')) {
    macShortcuts = macShortcuts.map((shortcut) => `shift+${shortcut}`);
    shortcuts = shortcuts.map((shortcut) => `shift+${shortcut}`);
  }

  // handle alt modifier
  if (modifiers.includes('alt') || modifiers.includes('option')) {
    macShortcuts = macShortcuts.map((shortcut) => `option+${shortcut}`);
    shortcuts = shortcuts.map((shortcut) => `alt+${shortcut}`);
  }

  // handle ctrl modifier
  if (modifiers.includes('ctrl') || modifiers.includes('command')) {
    macShortcuts = macShortcuts.map((shortcut) => `command+${shortcut}`);
    shortcuts = shortcuts.map((shortcut) => `ctrl+${shortcut}`);
  }

  return {
    osx: macShortcuts,
    windows: shortcuts,
    linux: shortcuts,
    other: shortcuts,
    help,
  };
};

const refreshShortcut = getShortcuts('r', {
  modifiers: 'alt',
  help: shortcutHelp.REFRESH,
});
const previousPageShortcut = getShortcuts('[', { modifiers: 'alt', help: shortcutHelp.PREV });
const nextPageShortcut = getShortcuts(']', { modifiers: 'alt', help: shortcutHelp.NEXT });
const fullscreenShortcut = getShortcuts(['f', 'p'], {
  modifiers: 'alt',
  help: shortcutHelp.FULLSCREEN,
});

export const keymap: KeyMap = {
  ELEMENT: {
    displayName: namespaceDisplayNames.ELEMENT,
    CUT: getShortcuts('x', { modifiers: 'ctrl', help: shortcutHelp.CUT }),
    COPY: getShortcuts('c', { modifiers: 'ctrl', help: shortcutHelp.COPY }),
    PASTE: getShortcuts('v', { modifiers: 'ctrl', help: shortcutHelp.PASTE }),
    CLONE: getShortcuts('d', { modifiers: 'ctrl', help: shortcutHelp.CLONE }),
    DELETE: getShortcuts(['del', 'backspace'], { help: shortcutHelp.DELETE }),
    BRING_FORWARD: getShortcuts('up', { modifiers: 'ctrl', help: shortcutHelp.BRING_TO_FRONT }),
    BRING_TO_FRONT: getShortcuts('up', {
      modifiers: ['ctrl', 'shift'],
      help: shortcutHelp.BRING_FORWARD,
    }),
    SEND_BACKWARD: getShortcuts('down', { modifiers: 'ctrl', help: shortcutHelp.SEND_BACKWARD }),
    SEND_TO_BACK: getShortcuts('down', {
      modifiers: ['ctrl', 'shift'],
      help: shortcutHelp.SEND_TO_BACK,
    }),
    GROUP: getShortcuts('g', { help: shortcutHelp.GROUP }),
    UNGROUP: getShortcuts('u', { help: shortcutHelp.UNGROUP }),
    SHIFT_UP: getShortcuts('up', { help: shortcutHelp.SHIFT_UP }),
    SHIFT_DOWN: getShortcuts('down', { help: shortcutHelp.SHIFT_DOWN }),
    SHIFT_LEFT: getShortcuts('left', { help: shortcutHelp.SHIFT_LEFT }),
    SHIFT_RIGHT: getShortcuts('right', { help: shortcutHelp.SHIFT_RIGHT }),
    NUDGE_UP: getShortcuts('up', {
      modifiers: ['shift'],
      help: shortcutHelp.NUDGE_UP,
    }),
    NUDGE_DOWN: getShortcuts('down', {
      modifiers: ['shift'],
      help: shortcutHelp.NUDGE_DOWN,
    }),
    NUDGE_LEFT: getShortcuts('left', {
      modifiers: ['shift'],
      help: shortcutHelp.NUDGE_LEFT,
    }),
    NUDGE_RIGHT: getShortcuts('right', {
      modifiers: ['shift'],
      help: shortcutHelp.NUDGE_RIGHT,
    }),
  },
  EXPRESSION: {
    displayName: namespaceDisplayNames.EXPRESSION,
    RUN: getShortcuts('enter', { modifiers: 'ctrl', help: shortcutHelp.RUN }),
  },
  EDITOR: {
    displayName: namespaceDisplayNames.EDITOR,
    // added for documentation purposes, not handled by `react-shortcuts`
    MULTISELECT: getShortcuts('click', { modifiers: 'shift', help: shortcutHelp.MULTISELECT }),
    // added for documentation purposes, not handled by `react-shortcuts`
    RESIZE_FROM_CENTER: getShortcuts('drag', {
      modifiers: 'alt',
      help: shortcutHelp.RESIZE_FROM_CENTER,
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    IGNORE_SNAP: getShortcuts('drag', {
      modifiers: 'ctrl',
      help: shortcutHelp.IGNORE_SNAP,
    }),
    // added for documentation purposes, not handled by `react-shortcuts`
    SELECT_BEHIND: getShortcuts('click', {
      modifiers: 'ctrl',
      help: shortcutHelp.SELECT_BEHIND,
    }),
    UNDO: getShortcuts('z', { modifiers: 'ctrl', help: shortcutHelp.UNDO }),
    REDO: getShortcuts('z', { modifiers: ['ctrl', 'shift'], help: shortcutHelp.REDO }),
    PREV: previousPageShortcut,
    NEXT: nextPageShortcut,
    EDITING: getShortcuts('e', { modifiers: 'alt', help: shortcutHelp.EDITING }),
    GRID: getShortcuts('g', { modifiers: 'alt', help: shortcutHelp.GRID }),
    REFRESH: refreshShortcut,
    ZOOM_IN: getShortcuts('plus', { modifiers: ['ctrl', 'alt'], help: shortcutHelp.ZOOM_IN }),
    ZOOM_OUT: getShortcuts('minus', { modifiers: ['ctrl', 'alt'], help: shortcutHelp.ZOOM_OUT }),
    ZOOM_RESET: getShortcuts('[', { modifiers: ['ctrl', 'alt'], help: shortcutHelp.ZOOM_RESET }),
    FULLSCREEN: fullscreenShortcut,
  },
  PRESENTATION: {
    displayName: namespaceDisplayNames.PRESENTATION,
    FULLSCREEN: fullscreenShortcut,
    FULLSCREEN_EXIT: getShortcuts('esc', { help: shortcutHelp.FULLSCREEN_EXIT }),
    // @ts-expect-error TODO: figure out why lodash is inferring booleans, rather than ShortcutMap.
    PREV: mapValues(previousPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'backspace' and 'left' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['backspace', 'left'])
    ),
    // @ts-expect-error TODO: figure out why lodash is inferring booleans, rather than ShortcutMap.
    NEXT: mapValues(nextPageShortcut, (osShortcuts: string[], key?: string) =>
      // adds 'space' and 'right' to list of shortcuts per OS
      key === 'help' ? osShortcuts : osShortcuts.concat(['space', 'right'])
    ),
    REFRESH: refreshShortcut,
    PAGE_CYCLE_TOGGLE: getShortcuts('p', { help: shortcutHelp.PAGE_CYCLE_TOGGLE }),
  },
};
