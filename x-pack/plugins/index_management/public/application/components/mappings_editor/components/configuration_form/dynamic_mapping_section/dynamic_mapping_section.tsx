/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiLink, EuiSpacer } from '@elastic/eui';

import { documentationService } from '../../../../../services/documentation';
import {
  getUseField,
  FormDataProvider,
  FormRow,
  Field,
  ToggleField,
  CheckBoxField,
} from '../../../shared_imports';
import { ALL_DATE_FORMAT_OPTIONS } from '../../../constants';

const UseField = getUseField({ component: Field });

export const DynamicMappingSection = () => (
  <FormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingTitle', {
      defaultMessage: 'Dynamic mapping',
    })}
    description={
      <>
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.dynamicMappingDescription"
          defaultMessage="Dynamic mapping allows an index template to interpret unmapped fields. {docsLink}"
          values={{
            docsLink: (
              <EuiLink href={documentationService.getDynamicMappingLink()} target="_blank">
                {i18n.translate('xpack.idxMgmt.mappingsEditor.dynamicMappingDocumentionLink', {
                  defaultMessage: 'Learn more.',
                })}
              </EuiLink>
            ),
          }}
        />
        <EuiSpacer size="m" />
        <UseField
          path="dynamicMapping.enabled"
          component={ToggleField}
          componentProps={{ 'data-test-subj': 'dynamicMappingsToggle' }}
        />
      </>
    }
  >
    <FormDataProvider pathsToWatch={['dynamicMapping.enabled', 'dynamicMapping.date_detection']}>
      {(formData) => {
        const {
          'dynamicMapping.enabled': enabled,
          'dynamicMapping.date_detection': dateDetection,
        } = formData;

        if (enabled === undefined) {
          // If enabled is not yet defined don't go any further.
          return null;
        }

        if (enabled) {
          return (
            <>
              <UseField
                key="numericDetectionToggle"
                path="dynamicMapping.numeric_detection"
                componentProps={{ 'data-test-subj': 'numericDetection' }}
              />
              <UseField path="dynamicMapping.date_detection" />
              {dateDetection && (
                <UseField
                  path="dynamicMapping.dynamic_date_formats"
                  componentProps={{
                    euiFieldProps: {
                      options: ALL_DATE_FORMAT_OPTIONS,
                      noSuggestions: false,
                    },
                  }}
                />
              )}
            </>
          );
        } else {
          return (
            <UseField
              key="throwErrorsCheckBox"
              path="dynamicMapping.throwErrorsForUnmappedFields"
              component={CheckBoxField}
            />
          );
        }
      }}
    </FormDataProvider>
  </FormRow>
);
