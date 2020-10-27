/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema } from '../../shared_imports';
import { RUNTIME_FIELD_OPTIONS } from '../../constants';
import { RuntimeField, RuntimeType, ComboBoxOption } from '../../types';

export const schema: FormSchema<RuntimeField> = {
  name: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.nameLabel', {
      defaultMessage: 'Name',
    }),
  },
  type: {
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.runtimeTypeLabel', {
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
    label: i18n.translate('xpack.idxMgmt.mappingsEditor.parameters.defineFieldLabel', {
      defaultMessage: 'Define field',
    }),
  },
};
