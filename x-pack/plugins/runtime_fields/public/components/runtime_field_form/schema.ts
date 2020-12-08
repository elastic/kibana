/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators } from '../../shared_imports';
import { RUNTIME_FIELD_OPTIONS } from '../../constants';
import { RuntimeField, RuntimeType, ComboBoxOption } from '../../types';

const { emptyField } = fieldValidators;

export const schema: FormSchema<RuntimeField> = {
  name: {
    label: i18n.translate('xpack.runtimeFields.form.nameLabel', {
      defaultMessage: 'Name',
    }),
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.runtimeFields.form.validations.nameIsRequiredErrorMessage', {
            defaultMessage: 'Give a name to the field.',
          })
        ),
      },
    ],
  },
  type: {
    label: i18n.translate('xpack.runtimeFields.form.runtimeTypeLabel', {
      defaultMessage: 'Type',
    }),
    defaultValue: 'keyword',
    deserializer: (fieldType?: RuntimeType) => {
      if (!fieldType) {
        return [];
      }

      const label = RUNTIME_FIELD_OPTIONS.find(({ value }) => value === fieldType)?.label;
      return [{ label: label ?? fieldType, value: fieldType }];
    },
    serializer: (value: Array<ComboBoxOption<RuntimeType>>) => value[0].value!,
  },
  script: {
    source: {
      label: i18n.translate('xpack.runtimeFields.form.defineFieldLabel', {
        defaultMessage: 'Define field (optional)',
      }),
    },
  },
};
