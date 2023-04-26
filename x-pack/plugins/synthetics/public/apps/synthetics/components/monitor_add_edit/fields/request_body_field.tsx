/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { stringify, parse } from 'query-string';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiTabbedContent } from '@elastic/eui';
import { CodeEditorMode, MonacoEditorLangId } from '../types';
import { KeyValuePairsField, Pair } from './key_value_field';
import { CodeEditor } from './code_editor';

export interface RequestBodyFieldProps {
  onChange: (requestBody: { type: CodeEditorMode; value: string }) => void;
  onBlur?: () => void;
  value: {
    type: CodeEditorMode;
    value: string;
  };
  readOnly?: boolean;
}

enum ResponseBodyType {
  CODE = 'code',
  FORM = 'form',
}

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBodyField = ({
  onChange,
  onBlur,
  value: { type, value },
  readOnly,
}: RequestBodyFieldProps) => {
  const [values, setValues] = useState<Record<ResponseBodyType, string>>({
    [ResponseBodyType.FORM]: type === CodeEditorMode.FORM ? value : '',
    [ResponseBodyType.CODE]: type !== CodeEditorMode.FORM ? value : '',
  });
  useEffect(() => {
    onChange({
      type,
      value:
        type === CodeEditorMode.FORM
          ? values[ResponseBodyType.FORM]
          : values[ResponseBodyType.CODE],
    });
  }, [onChange, type, values]);

  const handleSetMode = useCallback(
    (currentMode: CodeEditorMode) => {
      onChange({
        type: currentMode,
        value:
          currentMode === CodeEditorMode.FORM
            ? values[ResponseBodyType.FORM]
            : values[ResponseBodyType.CODE],
      });
    },
    [onChange, values]
  );

  const onChangeFormFields = useCallback(
    (pairs: Pair[]) => {
      const formattedPairs = pairs.reduce((acc: Record<string, string>, header) => {
        const [key, pairValue] = header;
        if (key) {
          return {
            ...acc,
            [key]: pairValue,
          };
        }
        return acc;
      }, {});
      return setValues((prevValues) => ({
        ...prevValues,
        [CodeEditorMode.FORM]: stringify(formattedPairs),
      }));
    },
    [setValues]
  );

  const defaultFormPairs: Pair[] = useMemo(() => {
    const pairs = parse(values[CodeEditorMode.FORM]);
    const keys = Object.keys(pairs);
    const formattedPairs: Pair[] = keys.map((key: string) => {
      // key, value, checked;
      return [key, `${pairs[key]}`];
    });
    return formattedPairs;
  }, [values]);

  const tabs = [
    {
      id: CodeEditorMode.PLAINTEXT,
      name: modeLabels[CodeEditorMode.PLAINTEXT],
      'data-test-subj': `syntheticsRequestBodyTab__${CodeEditorMode.PLAINTEXT}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.text.ariaLabel',
            {
              defaultMessage: 'Text code editor',
            }
          )}
          id={CodeEditorMode.PLAINTEXT}
          languageId={MonacoEditorLangId.PLAINTEXT}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
          readOnly={readOnly}
        />
      ),
    },
    {
      id: CodeEditorMode.JSON,
      name: modeLabels[CodeEditorMode.JSON],
      'data-test-subj': `syntheticsRequestBodyTab__${CodeEditorMode.JSON}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.json.ariaLabel',
            {
              defaultMessage: 'JSON code editor',
            }
          )}
          id={CodeEditorMode.JSON}
          languageId={MonacoEditorLangId.JSON}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
          readOnly={readOnly}
        />
      ),
    },
    {
      id: CodeEditorMode.XML,
      name: modeLabels[CodeEditorMode.XML],
      'data-test-subj': `syntheticsRequestBodyTab__${CodeEditorMode.XML}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.codeEditor.xml.ariaLabel',
            {
              defaultMessage: 'XML code editor',
            }
          )}
          id={CodeEditorMode.XML}
          languageId={MonacoEditorLangId.XML}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
          readOnly={readOnly}
        />
      ),
    },
    {
      id: CodeEditorMode.FORM,
      name: modeLabels[CodeEditorMode.FORM],
      'data-test-subj': `syntheticsRequestBodyTab__${CodeEditorMode.FORM}`,
      content: (
        <KeyValuePairsField
          addPairControlLabel={
            <FormattedMessage
              id="xpack.synthetics.createPackagePolicy.stepConfigure.requestBody.formField.addFormField.label"
              defaultMessage="Add form field"
            />
          }
          data-test-subj={'syntheticsFormField'}
          defaultPairs={defaultFormPairs}
          onChange={onChangeFormFields}
          onBlur={() => onBlur?.()}
          readOnly={readOnly}
        />
      ),
    },
  ];

  return (
    <div css={readOnly ? { cursor: 'not-allowed' } : undefined}>
      <EuiTabbedContent
        tabs={tabs}
        css={readOnly ? { pointerEvents: 'none' } : undefined}
        initialSelectedTab={tabs.find((tab) => tab.id === type)}
        autoFocus="selected"
        onTabClick={(tab) => {
          handleSetMode(tab.id as CodeEditorMode);
        }}
      />
    </div>
  );
};

const modeLabels = {
  [CodeEditorMode.FORM]: i18n.translate(
    'xpack.synthetics.createPackagePolicy.stepConfigure.requestBodyType.form',
    {
      defaultMessage: 'Form',
    }
  ),
  [CodeEditorMode.PLAINTEXT]: i18n.translate(
    'xpack.synthetics.createPackagePolicy.stepConfigure.requestBodyType.text',
    {
      defaultMessage: 'Text',
    }
  ),
  [CodeEditorMode.JSON]: i18n.translate(
    'xpack.synthetics.createPackagePolicy.stepConfigure.requestBodyType.JSON',
    {
      defaultMessage: 'JSON',
    }
  ),
  [CodeEditorMode.XML]: i18n.translate(
    'xpack.synthetics.createPackagePolicy.stepConfigure.requestBodyType.XML',
    {
      defaultMessage: 'XML',
    }
  ),
};
