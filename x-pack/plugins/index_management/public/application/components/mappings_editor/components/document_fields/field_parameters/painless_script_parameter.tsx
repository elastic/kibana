/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { PainlessLang, PainlessContext } from '@kbn/monaco';
import { EuiFormRow, EuiDescribedFormGroup, EuiComboBoxOptionOption } from '@elastic/eui';

import { CodeEditor, UseField, useFormData } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { EditFieldFormRow } from '../fields/edit_field';
import { RuntimeType } from '../../../types';
import { useMappingsState } from '../../../mappings_state_context';

interface Props {
  stack?: boolean;
}
const mapRuntimeTypeToContext = (runtimeType: RuntimeType): PainlessContext => {
  switch (runtimeType) {
    case 'keyword':
      return 'string_script_field_script_field';
    case 'long':
      return 'long_script_field_script_field';
    case 'double':
      return 'double_script_field_script_field';
    case 'date':
      return 'date_script_field';
    case 'ip':
      return 'ip_script_field_script_field';
    case 'boolean':
      return 'boolean_script_field_script_field';
    default:
      return 'painless_test';
  }
};

export const PainlessScriptParameter = ({ stack }: Props) => {
  const [{ runtime_type: runtimeType }] = useFormData<{
    runtime_type: EuiComboBoxOptionOption[];
  }>({
    watch: 'runtime_type',
  });

  const [painlessContext, setPainlessContext] = useState<PainlessContext>('painless_test');

  useEffect(() => {
    if (runtimeType?.length) {
      setPainlessContext(mapRuntimeTypeToContext(runtimeType[0]!.value as RuntimeType));
    }
  }, [setPainlessContext, runtimeType]);

  const {
    fields: { byId, rootLevelFields },
  } = useMappingsState();

  const getField = useCallback(
    (fieldId: string) => ({
      name: byId[fieldId].source.name,
      type: byId[fieldId].source.type,
    }),
    [byId]
  );

  const fieldsToAutocomplete = useMemo(
    () => rootLevelFields.map(getField).filter((field) => field.type !== 'runtime'),
    [rootLevelFields, getField]
  );

  const suggestionProvider = PainlessLang.getSuggestionProvider(
    painlessContext,
    fieldsToAutocomplete
  );

  return (
    <UseField path="script.source" config={getFieldConfig('script')}>
      {(scriptField) => {
        const error = scriptField.getErrorsMessages();
        const isInvalid = error ? Boolean(error.length) : false;

        const field = (
          <EuiFormRow label={scriptField.label} error={error} isInvalid={isInvalid} fullWidth>
            <CodeEditor
              languageId={PainlessLang.ID}
              // 99% width allows the editor to resize horizontally. 100% prevents it from resizing.
              width="99%"
              height="400px"
              value={scriptField.value as string}
              onChange={scriptField.setValue}
              suggestionProvider={suggestionProvider}
              options={{
                fontSize: 12,
                minimap: {
                  enabled: false,
                },
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                wrappingIndent: 'indent',
                automaticLayout: true,
                suggest: {
                  snippetsPreventQuickSuggestions: false,
                },
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
