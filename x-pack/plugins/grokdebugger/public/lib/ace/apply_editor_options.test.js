/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { applyEditorOptions } from './apply_editor_options';
import { EDITOR } from '../../../common/constants';

describe('applyEditorOptions', () => {
  let editor;
  let setUseWrapMode;
  let setScrollMargin;
  let setOptions;

  beforeEach(() => {
    setUseWrapMode = jest.fn();
    setScrollMargin = jest.fn();
    setOptions = jest.fn();

    editor = {
      getSession: () => {
        return { setUseWrapMode };
      },
      renderer: {
        setScrollMargin,
      },
      setOptions,
    };
  });

  it('creates default props and given line sizes', () => {
    const minLines = 14;
    const maxLines = 90;

    applyEditorOptions(editor, minLines, maxLines);

    expect(setUseWrapMode.mock.calls).toHaveLength(1);
    expect(setUseWrapMode.mock.calls[0][0]).toBe(true);

    expect(setScrollMargin.mock.calls).toHaveLength(1);
    expect(setScrollMargin.mock.calls[0][0]).toEqual(EDITOR.SCROLL_MARGIN_TOP_PX);
    expect(setScrollMargin.mock.calls[0][1]).toEqual(EDITOR.SCROLL_MARGIN_BOTTOM_PX);
    expect(setScrollMargin.mock.calls[0][2]).toEqual(0);
    expect(setScrollMargin.mock.calls[0][3]).toEqual(0);

    expect(setOptions.mock.calls).toHaveLength(1);
    expect(setOptions.mock.calls[0][0]).toEqual({
      highlightActiveLine: false,
      highlightGutterLine: false,
      minLines: 14,
      maxLines: 90,
    });

    expect(editor.$blockScrolling).toEqual(Infinity);
  });
});
