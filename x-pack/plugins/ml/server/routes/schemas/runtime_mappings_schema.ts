/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { isRuntimeField } from '../../../common/util/runtime_field_utils';

export const runtimeMappingsSchema = schema.object(
  {},
  {
    unknowns: 'allow',
    validate: (v: object) => {
      if (Object.values(v).some((o) => !isRuntimeField(o))) {
        return i18n.translate('xpack.ml.invalidRuntimeFieldMessage', {
          defaultMessage: 'Invalid runtime field',
        });
      }
    },
  }
);
