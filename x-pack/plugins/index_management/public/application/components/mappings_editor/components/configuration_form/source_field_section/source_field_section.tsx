/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiSpacer, EuiComboBox, EuiFormRow, EuiCallOut } from '@elastic/eui';

import { documentationService } from '../../../../../services/documentation';
import { UseField, FormDataProvider, FormRow, ToggleField } from '../../../shared_imports';
import { ComboBoxOption } from '../../../types';

export const SourceFieldSection = () => {
  const renderWarning = () => (
    <EuiCallOut
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutTitle', {
        defaultMessage: 'Use caution when disabling the _source field',
      })}
      iconType="alert"
      color="warning"
    >
      <p>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription1"
          defaultMessage="Disabling {source} lowers storage overhead within the index, but this comes at a cost. It also disables important features, such as the ability to reindex or debug queries by viewing the original document."
          values={{
            source: (
              <code>
                {i18n.translate(
                  'xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription1.sourceText',
                  {
                    defaultMessage: '_source',
                  }
                )}
              </code>
            ),
          }}
        />
      </p>

      <p>
        <a href={documentationService.getDisablingMappingSourceFieldLink()} target="_blank">
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2"
            defaultMessage="Learn more about alternatives to disabling the {source} field."
            values={{
              source: (
                <code>
                  {i18n.translate(
                    'xpack.idxMgmt.mappingsEditor.disabledSourceFieldCallOutDescription2.sourceText',
                    {
                      defaultMessage: '_source',
                    }
                  )}
                </code>
              ),
            }}
          />
        </a>
      </p>
    </EuiCallOut>
  );

  const renderFormFields = () => (
    <div data-test-subj="sourceField">
      <UseField path="sourceField.includes">
        {({ label, helpText, value, setValue }) => (
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiComboBox
              noSuggestions
              placeholder={i18n.translate(
                'xpack.idxMgmt.mappingsEditor.sourceIncludeField.placeholderLabel',
                {
                  defaultMessage: 'path.to.field.*',
                }
              )}
              selectedOptions={value as ComboBoxOption[]}
              onChange={(newValue) => {
                setValue(newValue);
              }}
              onCreateOption={(searchValue: string) => {
                const newOption = {
                  label: searchValue,
                };

                setValue([...(value as ComboBoxOption[]), newOption]);
              }}
              fullWidth
              data-test-subj="includesField"
            />
          </EuiFormRow>
        )}
      </UseField>

      <EuiSpacer size="m" />

      <UseField path="sourceField.excludes">
        {({ label, helpText, value, setValue }) => (
          <EuiFormRow label={label} helpText={helpText} fullWidth>
            <EuiComboBox
              noSuggestions
              placeholder={i18n.translate(
                'xpack.idxMgmt.mappingsEditor.sourceExcludeField.placeholderLabel',
                {
                  defaultMessage: 'path.to.field.*',
                }
              )}
              selectedOptions={value as ComboBoxOption[]}
              onChange={(newValue) => {
                setValue(newValue);
              }}
              onCreateOption={(searchValue: string) => {
                const newOption = {
                  label: searchValue,
                };

                setValue([...(value as ComboBoxOption[]), newOption]);
              }}
              fullWidth
              data-test-subj="excludesField"
            />
          </EuiFormRow>
        )}
      </UseField>
    </div>
  );

  return (
    <FormRow
      title={i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldTitle', {
        defaultMessage: '_source field',
      })}
      description={
        <>
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.sourceFieldDescription"
            defaultMessage="The _source field contains the original JSON document body that was provided at index time. Individual fields can be pruned by defining which ones to include or exclude from the _source field. {docsLink}"
            values={{
              docsLink: (
                <EuiLink href={documentationService.getMappingSourceFieldLink()} target="_blank">
                  {i18n.translate('xpack.idxMgmt.mappingsEditor.sourceFieldDocumentionLink', {
                    defaultMessage: 'Learn more.',
                  })}
                </EuiLink>
              ),
            }}
          />
          <EuiSpacer size="m" />
          <UseField path="sourceField.enabled" component={ToggleField} />
        </>
      }
    >
      <FormDataProvider pathsToWatch={['sourceField.enabled']}>
        {(formData) => {
          const { 'sourceField.enabled': enabled } = formData;

          if (enabled === undefined) {
            return null;
          }

          return enabled ? renderFormFields() : renderWarning();
        }}
      </FormDataProvider>
    </FormRow>
  );
};
