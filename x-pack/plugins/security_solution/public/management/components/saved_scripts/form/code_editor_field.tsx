/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCodeBlock, EuiFormRow, EuiCallOut } from '@elastic/eui';
import React, { useState, useCallback, useEffect } from 'react';
import parse from 'bash-parser';
import { useController } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { CodeEditor } from '@kbn/code-editor';
const euiCodeBlockCss = {
  minHeight: '100px',
};

interface CodeEditorFieldProps {
  euiFieldProps?: Record<string, unknown>;
  labelAppend?: string;
  helpText?: string;
}

function checkShellSyntax(script: string): string[] {
  try {
    // Parse the Bash script
    const ast = parse(script);

    console.log({ ast });
    // If parsing succeeds, return an empty array (no syntax errors)
    return [];
  } catch (error) {
    console.log({ error });
    // If parsing fails, return an array of error messages
    return [error.message];
  }
}

const CodeEditorFieldComponent: React.FC<CodeEditorFieldProps> = ({
  euiFieldProps,
  labelAppend,
  helpText,
}) => {
  const {
    field: { onChange, value },
    fieldState: { error },
  } = useController({
    name: 'command',
    rules: {
      required: {
        message: i18n.translate('xpack.endpoint.savedScripts.commandFlyoutForm.emptyCommandError', {
          defaultMessage: 'Command is a required field',
        }),
        value: true,
      },
    },
    defaultValue: '',
  });
  // const [editorValue, setEditorValue] = useState('');
  const [syntaxError, setSyntaxError] = useState(null);
  const [height, setHeight] = useState(600);
  // write an async useEffect to fetch the shellcheck binary
  useEffect(() => {
    const errors = checkShellSyntax(value);

    if (errors.length > 0) {
      setSyntaxError(errors.join('\n'));
    } else {
      setSyntaxError(null);
    }
  }, [value]);

  const editorDidMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    const minHeight = 100;
    const maxHeight = 1000;

    const updateHeight = () => {
      const contentHeight = Math.min(maxHeight, Math.max(minHeight, editor.getContentHeight()));
      setHeight(contentHeight);
    };

    editor.onDidContentSizeChange(updateHeight);
  }, []);
  return (
    <EuiFormRow
      label={i18n.translate('xpack.osquery.savedQuery.queryEditorLabel', {
        defaultMessage: 'Query',
      })}
      // labelAppend={!isEmpty(labelAppend) ? labelAppend : <OsquerySchemaLink />}
      helpText={helpText}
      isInvalid={!!error?.message}
      error={error?.message}
      fullWidth
    >
      {euiFieldProps?.isDisabled ? (
        <EuiCodeBlock
          css={euiCodeBlockCss}
          language="shell"
          fontSize="m"
          paddingSize="m"
          transparentBackground={!value.length}
        >
          {value}
        </EuiCodeBlock>
      ) : (
        <>
          <CodeEditor
            languageId={'shell'}
            value={value}
            onChange={onChange}
            options={{ automaticLayout: true }}
            height={`${height}px`}
            width="100%"
            editorDidMount={editorDidMount}
          />
          {syntaxError && (
            <EuiCallOut title="Sorry, there was an error" color="danger" iconType="error">
              <p>{syntaxError}</p>
            </EuiCallOut>
          )}
        </>
      )}
    </EuiFormRow>
  );
};

export const CodeEditorField = React.memo(CodeEditorFieldComponent);
