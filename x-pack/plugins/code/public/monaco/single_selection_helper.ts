/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { editor } from 'monaco-editor';

const editors = new Set();

function clearSelection(ed: editor.IStandaloneCodeEditor) {
  const sel = ed.getSelection();
  if (sel && !sel.isEmpty()) {
    ed.setSelection({
      selectionStartLineNumber: sel.selectionStartLineNumber,
      selectionStartColumn: sel.selectionStartColumn,
      positionLineNumber: sel.selectionStartLineNumber,
      positionColumn: sel.selectionStartColumn,
    });
  }
}

export function registerEditor(ed: editor.IStandaloneCodeEditor) {
  editors.add(ed);
  ed.onDidChangeCursorSelection(() => {
    editors.forEach(e => {
      if (e !== ed) {
        clearSelection(e);
      }
    });
  });
  ed.onDidDispose(() => editors.delete(ed));
}
