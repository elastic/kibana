/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, FC } from 'react';
import { EuiFormRow } from '@elastic/eui';
import { LangModuleType } from '@kbn/monaco';
import { CodeEditorField } from '@kbn/kibana-react-plugin/public';
import usePrevious from 'react-use/lib/usePrevious';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';
import { withDebounceArg } from '../../../public/components/with_debounce_arg';

const { Editor: strings } = ArgumentStrings;

interface EditorArgProps {
  onValueChange: (value: string) => void;
  argValue: string;
  typeInstance?: {
    options: {
      language: LangModuleType['ID'];
    };
  };
  renderError: (err?: string | Error) => void;
}

const EditorArg: FC<EditorArgProps> = ({ argValue, typeInstance, onValueChange, renderError }) => {
  const [value, setValue] = useState(argValue);
  const prevValue = usePrevious(value);

  const onChange = useCallback((text: string) => setValue(text), [setValue]);

  useEffect(() => {
    onValueChange(value);
  }, [onValueChange, value]);

  useEffect(() => {
    // update editor content, if it has been changed from within the expression.
    if (prevValue === value && argValue !== value) {
      setValue(argValue);
    }
  }, [argValue, setValue, prevValue, value]);

  if (typeof argValue !== 'string') {
    renderError();
    return null;
  }

  const { language } = typeInstance?.options ?? {};

  return (
    <EuiFormRow display="rowCompressed" data-test-subj="canvasCodeEditorField">
      <CodeEditorField
        languageId={language ?? ''}
        value={value}
        onChange={onChange}
        options={{
          fontSize: 14,
          scrollBeyondLastLine: false,
          quickSuggestions: true,
          minimap: { enabled: false },
          wordWrap: 'on',
          wrappingIndent: 'indent',
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
        }}
        height="350px"
        editorDidMount={(editor) => {
          const model = editor.getModel();
          model?.updateOptions({ tabSize: 2 });
        }}
      />
    </EuiFormRow>
  );
};

export const editor = () => ({
  name: 'editor',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(withDebounceArg(EditorArg, 250)),
});
