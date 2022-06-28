/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const MAX_QUERY_LENGTH = 2000;

import { i18n } from '@kbn/i18n';
import { FIELD_TYPES } from '../../shared_imports';
import { queryFieldValidation } from '../../common/validations';
import { fieldValidators } from '../../shared_imports';

export const liveQueryFormSchema = {
  agentSelection: {
    defaultValue: {
      agents: [],
      allAgentsSelected: false,
      platformsSelected: [],
      policiesSelected: [],
    },
    type: FIELD_TYPES.JSON,
    validations: [],
  },
  savedQueryId: {
    type: FIELD_TYPES.TEXT,
    validations: [],
  },
  query: {
    defaultValue: '',
    type: FIELD_TYPES.TEXT,
    validations: [
      {
        validator: fieldValidators.maxLengthField({
          length: MAX_QUERY_LENGTH,
          message: i18n.translate('xpack.osquery.liveQuery.queryForm.largeQueryError', {
            defaultMessage: 'Query is too large (max {maxLength} characters)',
            values: { maxLength: MAX_QUERY_LENGTH },
          }),
        }),
      },
      { validator: queryFieldValidation },
    ],
  },
  packId: {
    type: FIELD_TYPES.SUPER_SELECT,
  },
  ecs_mapping: {
    defaultValue: [],
    type: FIELD_TYPES.JSON,
  },
};
