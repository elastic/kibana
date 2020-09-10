/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useRef, useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiScreenReaderOnly } from '@elastic/eui';
import { Editor as AceEditor } from 'brace';

import { initializeEditor } from './init_editor';
import { ace } from '../../../../../../src/plugins/es_ui_shared/public';

const { useUIAceKeyboardMode } = ace;

type EditorShim = ReturnType<typeof createEditorShim>;

export type EditorInstance = EditorShim;

export interface Props {
  licenseEnabled: boolean;
  initialValue: string;
  onEditorReady: (editor: EditorShim) => void;
}

const createEditorShim = (aceEditor: AceEditor) => {
  return {
    getValue() {
      return aceEditor.getValue();
    },
    focus() {
      aceEditor.focus();
    },
  };
};

const EDITOR_INPUT_ID = 'SearchProfilerTextArea';

export const Editor = memo(({ licenseEnabled, initialValue, onEditorReady }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null as any);
  const editorInstanceRef = useRef<AceEditor>(null as any);

  const [textArea, setTextArea] = useState<HTMLTextAreaElement | null>(null);

  useUIAceKeyboardMode(textArea);

  useEffect(() => {
    const divEl = containerRef.current;
    editorInstanceRef.current = initializeEditor({ el: divEl, licenseEnabled });
    editorInstanceRef.current.setValue(initialValue, 1);
    const textarea = divEl.querySelector<HTMLTextAreaElement>('textarea');
    if (textarea) {
      textarea.setAttribute('id', EDITOR_INPUT_ID);
    }
    setTextArea(licenseEnabled ? containerRef.current!.querySelector('textarea') : null);

    onEditorReady(createEditorShim(editorInstanceRef.current));
  }, [initialValue, onEditorReady, licenseEnabled]);

  return (
    <>
      <EuiScreenReaderOnly>
        <label htmlFor={EDITOR_INPUT_ID}>
          {i18n.translate('xpack.searchProfiler.editorElementLabel', {
            defaultMessage: 'Dev Tools Search Profiler editor',
          })}
        </label>
      </EuiScreenReaderOnly>
      <div data-test-subj="searchProfilerEditor" ref={containerRef} />
    </>
  );
});
