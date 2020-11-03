/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { PainlessLang } from '@kbn/monaco';
import { EuiFormRow, EuiDescribedFormGroup } from '@elastic/eui';

import { CodeEditor, UseField } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { EditFieldFormRow } from '../fields/edit_field';

interface Props {
  stack?: boolean;
}

export const PainlessScriptParameter = ({ stack }: Props) => {
  return (
    <UseField<string> path="script.source" config={getFieldConfig('script')}>
      {(scriptField) => {
        const error = scriptField.getErrorsMessages();
        const isInvalid = error ? Boolean(error.length) : false;

        const field = (
          <EuiFormRow label={scriptField.label} error={error} isInvalid={isInvalid} fullWidth>
            <CodeEditor
              languageId={PainlessLang.ID}
              width="100%"
              height="400px"
              value={scriptField.value}
              onChange={scriptField.setValue}
              options={{
                fontSize: 12,
                minimap: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
              }}
            />
          </EuiFormRow>
        );

        const fieldTitle = i18n.translate('xpack.idxMgmt.mappingsEditor.painlessScript.title', {
          defaultMessage: 'Emitted value',
        });

        const fieldDescription = i18n.translate(
          'xpack.idxMgmt.mappingsEditor.painlessScript.description',
          {
            defaultMessage: 'Use emit() to define the value of this runtime field.',
          }
        );

        if (stack) {
          return (
            <EditFieldFormRow title={fieldTitle} description={fieldDescription} withToggle={false}>
              {field}
            </EditFieldFormRow>
          );
        }

        return (
          <EuiDescribedFormGroup
            title={<h3>{fieldTitle}</h3>}
            description={fieldDescription}
            fullWidth={true}
          >
            {field}
          </EuiDescribedFormGroup>
        );
      }}
    </UseField>
  );
};
