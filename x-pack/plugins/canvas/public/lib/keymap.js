/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const refresh = { osx: 'option+r', windows: 'alt+r', linux: 'alt+r', other: 'alt+r' };

export const keymap = {
  EDITOR: {
    UNDO: { osx: 'command+z', windows: 'ctrl+z', linux: 'ctrl+z', other: 'ctrl+z' },
    REDO: {
      osx: 'command+shift+y',
      windows: 'ctrl+shift+y',
      linux: 'ctrl+shift+y',
      other: 'ctrl+shift+y',
    },
    NEXT: { osx: 'option+]', windows: 'alt+]', linux: 'alt+]', other: 'alt+]' },
    PREV: { osx: 'option+[', windows: 'alt+[', linux: 'alt+[', other: 'alt+[' },
    FULLSCREEN: {
      osx: ['option+p', 'option+f'],
      windows: ['alt+p', 'alt+f'],
      linux: ['alt+p', 'alt+f'],
      other: ['alt+p', 'alt+f'],
    },
    FULLSCREEN_EXIT: ['escape'],
    EDITING: { osx: 'option+e', windows: 'alt+e', linux: 'alt+e', other: 'alt+e' },
    GRID: { osx: 'option+g', windows: 'alt+g', linux: 'alt+g', other: 'alt+g' },
    REFRESH: refresh,
  },
  ELEMENT: {
    COPY: { osx: 'command+c', windows: 'ctrl+c', linux: 'ctrl+c', other: 'ctrl+c' },
    CUT: { osx: 'command+x', windows: 'ctrl+x', linux: 'ctrl+x', other: 'ctrl+x' },
    PASTE: { osx: 'command+v', windows: 'ctrl+v', linux: 'ctrl+v', other: 'ctrl+v' },
    DELETE: ['del', 'backspace'],
  },
  PRESENTATION: {
    NEXT: {
      osx: ['space', 'right', 'option+]'],
      windows: ['space', 'right', 'alt+]'],
      linux: ['space', 'right', 'alt+]'],
      other: ['space', 'right', 'alt+]'],
    },
    PREV: {
      osx: ['left', 'option+['],
      windows: ['left', 'alt+['],
      linux: ['left', 'alt+['],
      other: ['left', 'alt+['],
    },
    REFRESH: refresh,
  },
};
