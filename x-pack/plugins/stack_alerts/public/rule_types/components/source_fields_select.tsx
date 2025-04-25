/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { uniqBy } from 'lodash';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { FieldOption } from '@kbn/triggers-actions-ui-plugin/public/common';
import { IErrorObject } from '@kbn/triggers-actions-ui-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { MAX_SELECTABLE_SOURCE_FIELDS, validSourceFields } from '../../../common/constants';
import { SourceField } from '../es_query/types';

interface SourceFieldsOption {
  label: string;
  value: string;
}

interface SourceFieldsProps {
  esFields: FieldOption[];
  onChangeSourceFields: (selectedSourceFields: SourceField[]) => void;
  errors: string | string[] | IErrorObject;
  sourceFields?: SourceField[];
}

export const SourceFields: React.FC<SourceFieldsProps> = ({
  esFields,
  onChangeSourceFields,
  errors,
  sourceFields,
}) => {
  const [sourceFieldsOptions, setSourceFieldsOptions] = useState<SourceFieldsOption[]>([]);

  useEffect(() => {
    const options = uniqBy(
      esFields
        .filter((f) => f.aggregatable)
        .flatMap((f) => {
          const validSourceField = validSourceFields.find(
            (validatedField) => f.name === validatedField || f.name === `${validatedField}.keyword`
          );
          if (validSourceField) {
            return [
              {
                label: validSourceField,
                value: f.name,
                'data-test-subj': `option-${validSourceField}`,
              },
            ];
          }
          return [];
        }),
      'label'
    );

    setSourceFieldsOptions(options);

    // if not sourceFields, auto select the current options
    if (!sourceFields) {
      const fields: SourceField[] = [];
      options.forEach((f) => {
        if (f.value && fields.length < MAX_SELECTABLE_SOURCE_FIELDS) {
          fields.push({ label: f.label, searchPath: f.value });
        }
      });
      onChangeSourceFields(fields);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esFields]);

  return sourceFieldsOptions.length > 0 ? (
    <EuiFormRow
      fullWidth
      // @ts-expect-error upgrade typescript v5.1.6
      isInvalid={errors.length > 0 && sourceFields !== undefined}
      error={errors}
      label={
        <FormattedMessage
          id="xpack.stackAlerts.components.ui.sourceFieldsSelect.title"
          defaultMessage="Add more fields to alert details"
        />
      }
    >
      <EuiComboBox
        fullWidth
        placeholder={i18n.translate(
          'xpack.stackAlerts.components.ui.sourceFieldsSelect.placeholder',
          {
            defaultMessage: 'Select fields',
          }
        )}
        data-test-subj="sourceFields"
        // @ts-expect-error upgrade typescript v5.1.6
        isInvalid={errors.length > 0 && sourceFields !== undefined}
        selectedOptions={(sourceFields || []).map((f) => ({
          label: f.label,
          value: f.searchPath,
          'data-test-subj': `option-${f.label}`,
        }))}
        onChange={(options) => {
          const fields: SourceField[] = [];
          options.forEach((f) => {
            if (f.value) {
              fields.push({ label: f.label, searchPath: f.value });
            }
          });
          onChangeSourceFields(fields);
        }}
        options={sourceFieldsOptions}
      />
    </EuiFormRow>
  ) : null;
};
