/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { ELEMENT_NUDGE_OFFSET, ELEMENT_SHIFT_OFFSET } from '../common/lib/constants';

export const ShortcutStrings = {
  getNamespaceDisplayNames: () => ({
    ELEMENT: i18n.translate('xpack.canvas.keyboardShortcuts.namespace.elementDisplayName', {
      defaultMessage: 'Element controls',
    }),
    EXPRESSION: i18n.translate('xpack.canvas.keyboardShortcuts.namespace.expressionDisplayName', {
      defaultMessage: 'Expression controls',
    }),
    EDITOR: i18n.translate('xpack.canvas.keyboardShortcuts.namespace.editorDisplayName', {
      defaultMessage: 'Editor controls',
    }),
    PRESENTATION: i18n.translate(
      'xpack.canvas.keyboardShortcuts.namespace.presentationDisplayName',
      {
        defaultMessage: 'Presentation controls',
      }
    ),
  }),
  getShortcutHelp: () => ({
    CUT: i18n.translate('xpack.canvas.keyboardShortcuts.cutShortcutHelpText', {
      defaultMessage: 'Cut',
    }),
    COPY: i18n.translate('xpack.canvas.keyboardShortcuts.copyShortcutHelpText', {
      defaultMessage: 'Copy',
    }),
    PASTE: i18n.translate('xpack.canvas.keyboardShortcuts.pasteShortcutHelpText', {
      defaultMessage: 'Paste',
    }),
    CLONE: i18n.translate('xpack.canvas.keyboardShortcuts.cloneShortcutHelpText', {
      defaultMessage: 'Clone',
    }),
    DELETE: i18n.translate('xpack.canvas.keyboardShortcuts.deleteShortcutHelpText', {
      defaultMessage: 'Delete',
    }),
    BRING_FORWARD: i18n.translate('xpack.canvas.keyboardShortcuts.bringFowardShortcutHelpText', {
      defaultMessage: 'Bring forward',
    }),
    BRING_TO_FRONT: i18n.translate('xpack.canvas.keyboardShortcuts.bringToFrontShortcutHelpText', {
      defaultMessage: 'Bring to front',
    }),
    SEND_BACKWARD: i18n.translate('xpack.canvas.keyboardShortcuts.sendBackwardShortcutHelpText', {
      defaultMessage: 'Send backward',
    }),
    SEND_TO_BACK: i18n.translate('xpack.canvas.keyboardShortcuts.sendToBackShortcutHelpText', {
      defaultMessage: 'Send to back',
    }),
    GROUP: i18n.translate('xpack.canvas.keyboardShortcuts.groupShortcutHelpText', {
      defaultMessage: 'Group',
    }),
    UNGROUP: i18n.translate('xpack.canvas.keyboardShortcuts.ungroupShortcutHelpText', {
      defaultMessage: 'Ungroup',
    }),
    SHIFT_UP: i18n.translate('xpack.canvas.keyboardShortcuts.shiftUpShortcutHelpText', {
      defaultMessage: 'Shift up by {ELEMENT_SHIFT_OFFSET}px',
      values: {
        ELEMENT_SHIFT_OFFSET,
      },
    }),
    SHIFT_DOWN: i18n.translate('xpack.canvas.keyboardShortcuts.shiftDownShortcutHelpText', {
      defaultMessage: 'Shift down by {ELEMENT_SHIFT_OFFSET}px',
      values: {
        ELEMENT_SHIFT_OFFSET,
      },
    }),
    SHIFT_LEFT: i18n.translate('xpack.canvas.keyboardShortcuts.shiftLeftShortcutHelpText', {
      defaultMessage: 'Shift left by {ELEMENT_SHIFT_OFFSET}px',
      values: {
        ELEMENT_SHIFT_OFFSET,
      },
    }),
    SHIFT_RIGHT: i18n.translate('xpack.canvas.keyboardShortcuts.shiftRightShortcutHelpText', {
      defaultMessage: 'Shift right by {ELEMENT_SHIFT_OFFSET}px',
      values: {
        ELEMENT_SHIFT_OFFSET,
      },
    }),
    NUDGE_UP: i18n.translate('xpack.canvas.keyboardShortcuts.nudgeUpShortcutHelpText', {
      defaultMessage: 'Shift up by {ELEMENT_NUDGE_OFFSET}px',
      values: {
        ELEMENT_NUDGE_OFFSET,
      },
    }),
    NUDGE_DOWN: i18n.translate('xpack.canvas.keyboardShortcuts.nudgeDownShortcutHelpText', {
      defaultMessage: 'Shift down by {ELEMENT_NUDGE_OFFSET}px',
      values: {
        ELEMENT_NUDGE_OFFSET,
      },
    }),
    NUDGE_LEFT: i18n.translate('xpack.canvas.keyboardShortcuts.nudgeLeftShortcutHelpText', {
      defaultMessage: 'Shift left by {ELEMENT_NUDGE_OFFSET}px',
      values: {
        ELEMENT_NUDGE_OFFSET,
      },
    }),
    NUDGE_RIGHT: i18n.translate('xpack.canvas.keyboardShortcuts.nudgeRightShortcutHelpText', {
      defaultMessage: 'Shift right by {ELEMENT_NUDGE_OFFSET}px',
      values: {
        ELEMENT_NUDGE_OFFSET,
      },
    }),
    RUN: i18n.translate('xpack.canvas.keyboardShortcuts.runShortcutHelpText', {
      defaultMessage: 'Run whole expression',
    }),
    MULTISELECT: i18n.translate('xpack.canvas.keyboardShortcuts.multiselectShortcutHelpText', {
      defaultMessage: 'Select multiple elements',
    }),
    RESIZE_FROM_CENTER: i18n.translate(
      'xpack.canvas.keyboardShortcuts.resizeFromCenterShortcutHelpText',
      {
        defaultMessage: 'Resize from center',
      }
    ),
    IGNORE_SNAP: i18n.translate('xpack.canvas.keyboardShortcuts.ignoreSnapShortcutHelpText', {
      defaultMessage: 'Move, resize, and rotate without snapping',
    }),
    SELECT_BEHIND: i18n.translate('xpack.canvas.keyboardShortcuts.selectBehindShortcutHelpText', {
      defaultMessage: 'Select element below',
    }),
    UNDO: i18n.translate('xpack.canvas.keyboardShortcuts.undoShortcutHelpText', {
      defaultMessage: 'Undo last action',
    }),
    REDO: i18n.translate('xpack.canvas.keyboardShortcuts.redoShortcutHelpText', {
      defaultMessage: 'Redo last action',
    }),
    PREV: i18n.translate('xpack.canvas.keyboardShortcuts.prevShortcutHelpText', {
      defaultMessage: 'Go to previous page',
    }),
    NEXT: i18n.translate('xpack.canvas.keyboardShortcuts.nextShortcutHelpText', {
      defaultMessage: 'Go to next page',
    }),
    EDITING: i18n.translate('xpack.canvas.keyboardShortcuts.editingShortcutHelpText', {
      defaultMessage: 'Toggle edit mode',
    }),
    GRID: i18n.translate('xpack.canvas.keyboardShortcuts.gridShortcutHelpText', {
      defaultMessage: 'Show grid',
    }),
    REFRESH: i18n.translate('xpack.canvas.keyboardShortcuts.ShortcutHelpText', {
      defaultMessage: 'Refresh workpad',
    }),
    ZOOM_IN: i18n.translate('xpack.canvas.keyboardShortcuts.zoomInShortcutHelpText', {
      defaultMessage: 'Zoom in',
    }),
    ZOOM_OUT: i18n.translate('xpack.canvas.keyboardShortcuts.zoomOutShortcutHelpText', {
      defaultMessage: 'Zoom out',
    }),
    ZOOM_RESET: i18n.translate('xpack.canvas.keyboardShortcuts.zoomResetShortcutHelpText', {
      defaultMessage: 'Reset zoom to 100%',
    }),
    FULLSCREEN: i18n.translate('xpack.canvas.keyboardShortcuts.fullscreenShortcutHelpText', {
      defaultMessage: 'Enter presentation mode',
    }),
    FULLSCREEN_EXIT: i18n.translate(
      'xpack.canvas.keyboardShortcuts.fullscreenExitShortcutHelpText',
      {
        defaultMessage: 'Exit presentation mode',
      }
    ),
    PAGE_CYCLE_TOGGLE: i18n.translate(
      'xpack.canvas.keyboardShortcuts.pageCycleToggleShortcutHelpText',
      {
        defaultMessage: 'Toggle page cycling',
      }
    ),
  }),
};
