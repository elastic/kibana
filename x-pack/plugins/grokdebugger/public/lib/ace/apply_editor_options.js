/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EDITOR } from '../../../common/constants';

export function applyEditorOptions(editor, minLines, maxLines) {
  editor.getSession().setUseWrapMode(true);

  /*
    * This sets the space between the editor's borders and the
    * edges of the top/bottom lines to make for a less-crowded
    * typing experience.
    */
  editor.renderer.setScrollMargin(
    EDITOR.SCROLL_MARGIN_TOP,
    EDITOR.SCROLL_MARGIN_BOTTOM,
    0,
    0
  );

  editor.setOptions({
    highlightActiveLine: false,
    highlightGutterLine: false,
    minLines,
    maxLines
  });

  editor.$blockScrolling = Infinity;
}
