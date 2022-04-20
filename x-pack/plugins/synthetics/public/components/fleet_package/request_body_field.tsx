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
import { Mode, MonacoEditorLangId } from './types';
import { KeyValuePairsField, Pair } from './key_value_field';
import { CodeEditor } from './code_editor';

interface Props {
  onChange: (requestBody: { type: Mode; value: string }) => void;
  onBlur?: () => void;
  type: Mode;
  value: string;
}

enum ResponseBodyType {
  CODE = 'code',
  FORM = 'form',
}

// TO DO: Look into whether or not code editor reports errors, in order to prevent form submission on an error
export const RequestBodyField = ({ onChange, onBlur, type, value }: Props) => {
  const [values, setValues] = useState<Record<ResponseBodyType, string>>({
    [ResponseBodyType.FORM]: type === Mode.FORM ? value : '',
    [ResponseBodyType.CODE]: type !== Mode.FORM ? value : '',
  });
  useEffect(() => {
    onChange({
      type,
      value: type === Mode.FORM ? values[ResponseBodyType.FORM] : values[ResponseBodyType.CODE],
    });
  }, [onChange, type, values]);

  const handleSetMode = useCallback(
    (currentMode: Mode) => {
      onChange({
        type: currentMode,
        value:
          currentMode === Mode.FORM ? values[ResponseBodyType.FORM] : values[ResponseBodyType.CODE],
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
        [Mode.FORM]: stringify(formattedPairs),
      }));
    },
    [setValues]
  );

  const defaultFormPairs: Pair[] = useMemo(() => {
    const pairs = parse(values[Mode.FORM]);
    const keys = Object.keys(pairs);
    const formattedPairs: Pair[] = keys.map((key: string) => {
      // key, value, checked;
      return [key, `${pairs[key]}`];
    });
    return formattedPairs;
  }, [values]);

  const tabs = [
    {
      id: Mode.PLAINTEXT,
      name: modeLabels[Mode.PLAINTEXT],
      'data-test-subj': `syntheticsRequestBodyTab__${Mode.PLAINTEXT}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.requestBody.codeEditor.text.ariaLabel',
            {
              defaultMessage: 'Text code editor',
            }
          )}
          id={Mode.PLAINTEXT}
          languageId={MonacoEditorLangId.PLAINTEXT}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
        />
      ),
    },
    {
      id: Mode.JSON,
      name: modeLabels[Mode.JSON],
      'data-test-subj': `syntheticsRequestBodyTab__${Mode.JSON}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.requestBody.codeEditor.json.ariaLabel',
            {
              defaultMessage: 'JSON code editor',
            }
          )}
          id={Mode.JSON}
          languageId={MonacoEditorLangId.JSON}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
        />
      ),
    },
    {
      id: Mode.XML,
      name: modeLabels[Mode.XML],
      'data-test-subj': `syntheticsRequestBodyTab__${Mode.XML}`,
      content: (
        <CodeEditor
          ariaLabel={i18n.translate(
            'xpack.uptime.createPackagePolicy.stepConfigure.requestBody.codeEditor.xml.ariaLabel',
            {
              defaultMessage: 'XML code editor',
            }
          )}
          id={Mode.XML}
          languageId={MonacoEditorLangId.XML}
          onChange={(code) => {
            setValues((prevValues) => ({ ...prevValues, [ResponseBodyType.CODE]: code }));
            onBlur?.();
          }}
          value={values[ResponseBodyType.CODE]}
        />
      ),
    },
    {
      id: Mode.FORM,
      name: modeLabels[Mode.FORM],
      'data-test-subj': `syntheticsRequestBodyTab__${Mode.FORM}`,
      content: (
        <KeyValuePairsField
          addPairControlLabel={
            <FormattedMessage
              id="xpack.uptime.createPackagePolicy.stepConfigure.requestBody.formField.addFormField.label"
              defaultMessage="Add form field"
            />
          }
          defaultPairs={defaultFormPairs}
          onChange={onChangeFormFields}
          onBlur={() => onBlur?.()}
        />
      ),
    },
  ];

  return (
    <EuiTabbedContent
      tabs={tabs}
      initialSelectedTab={tabs.find((tab) => tab.id === type)}
      autoFocus="selected"
      onTabClick={(tab) => {
        handleSetMode(tab.id as Mode);
      }}
    />
  );
};

const modeLabels = {
  [Mode.FORM]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.requestBodyType.form',
    {
      defaultMessage: 'Form',
    }
  ),
  [Mode.PLAINTEXT]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.requestBodyType.text',
    {
      defaultMessage: 'Text',
    }
  ),
  [Mode.JSON]: i18n.translate(
    'xpack.uptime.createPackagePolicy.stepConfigure.requestBodyType.JSON',
    {
      defaultMessage: 'JSON',
    }
  ),
  [Mode.XML]: i18n.translate('xpack.uptime.createPackagePolicy.stepConfigure.requestBodyType.XML', {
    defaultMessage: 'XML',
  }),
};
