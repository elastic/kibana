/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFormRow, EuiComboBox, EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { UseField, SerializerFunc } from '../../../shared_imports';
import { getFieldConfig } from '../../../lib';
import { PARAMETERS_DEFINITION } from '../../../constants';
import { NormalizedField, NormalizedFields, AliasOption } from '../../../types';
import { EditFieldFormRow } from '../fields/edit_field';

const targetFieldTypeNotAllowed = PARAMETERS_DEFINITION.path.targetTypesNotAllowed;

const getSuggestedFields = (
  allFields: NormalizedFields['byId'],
  currentField?: NormalizedField
): AliasOption[] =>
  Object.entries(allFields)
    .filter(([id, field]) => {
      if (currentField && id === currentField.id) {
        return false;
      }

      // An alias cannot point certain field types ("object", "nested", "alias")
      if (targetFieldTypeNotAllowed.includes(field.source.type)) {
        return false;
      }

      return true;
    })
    .map(([id, field]) => ({
      id,
      label: field.path.join(' > '),
    }))
    .sort((a, b) => (a.label > b.label ? 1 : a.label < b.label ? -1 : 0));

const getDeserializer = (allFields: NormalizedFields['byId']): SerializerFunc => (
  value: string | object
): AliasOption[] => {
  if (typeof value === 'string' && Boolean(value)) {
    return [
      {
        id: value,
        label: allFields[value].path.join(' > '),
      },
    ];
  }

  return [];
};

interface Props {
  allFields: NormalizedFields['byId'];
  field?: NormalizedField;
}

export const PathParameter = ({ field, allFields }: Props) => {
  const suggestedFields = getSuggestedFields(allFields, field);

  return (
    <UseField
      path="path"
      config={{
        ...getFieldConfig('path'),
        deserializer: getDeserializer(allFields),
      }}
    >
      {(pathField) => {
        const error = pathField.getErrorsMessages();
        const isInvalid = error ? Boolean(error.length) : false;

        return (
          <EditFieldFormRow
            title={i18n.translate('xpack.idxMgmt.mappingsEditor.aliasType.aliasTargetFieldTitle', {
              defaultMessage: 'Alias target',
            })}
            description={i18n.translate(
              'xpack.idxMgmt.mappingsEditor.aliasType.aliasTargetFieldDescription',
              {
                defaultMessage:
                  'Select the field you want your alias to point to. You will then be able to use the alias instead of the target field in search requests, and selected other APIs like field capabilities.',
              }
            )}
            withToggle={false}
          >
            <>
              {!Boolean(suggestedFields.length) && (
                <>
                  <EuiCallOut color="warning">
                    <p>
                      {i18n.translate(
                        'xpack.idxMgmt.mappingsEditor.aliasType.noFieldsAddedWarningMessage',
                        {
                          defaultMessage:
                            'You need to add at least one field before creating an alias.',
                        }
                      )}
                    </p>
                  </EuiCallOut>
                  <EuiSpacer />
                </>
              )}

              <EuiFormRow
                label={pathField.label}
                helpText={pathField.helpText}
                error={error}
                isInvalid={isInvalid}
                fullWidth
              >
                <EuiComboBox
                  placeholder={i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.aliasType.pathPlaceholderLabel',
                    {
                      defaultMessage: 'Select a field',
                    }
                  )}
                  singleSelection={{ asPlainText: true }}
                  options={suggestedFields}
                  selectedOptions={pathField.value as AliasOption[]}
                  onChange={(value) => pathField.setValue(value)}
                  isClearable={false}
                  fullWidth
                />
              </EuiFormRow>
            </>
          </EditFieldFormRow>
        );
      }}
    </UseField>
  );
};
