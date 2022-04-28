/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { schema } from '@kbn/config-schema';

import { UiSettingsParams } from '@kbn/core/server';

export const FIELD_EXISTENCE_SETTING = 'lens:useFieldExistenceSampling';

export const getUiSettings: () => Record<string, UiSettingsParams> = () => ({
  [FIELD_EXISTENCE_SETTING]: {
    name: i18n.translate('xpack.lens.advancedSettings.useFieldExistenceSampling.title', {
      defaultMessage: 'Use field existence sampling',
    }),
    value: false,
    description: i18n.translate(
      'xpack.lens.advancedSettings.useFieldExistenceSampling.description',
      {
        defaultMessage:
          'If enabled, document sampling is used to determine field existence (available or empty) for the Lens field list instead of relying on index mappings.',
      }
    ),
    category: ['visualization'],
    schema: schema.boolean(),
  },
});
