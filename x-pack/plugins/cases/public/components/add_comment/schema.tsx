/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSchema } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { FIELD_TYPES } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { CommentRequestUserType } from '../../../common/api';

import * as i18n from './translations';

const { emptyField } = fieldValidators;

export interface AddCommentFormSchema {
  comment: CommentRequestUserType['comment'];
}

export const schema: FormSchema<AddCommentFormSchema> = {
  comment: {
    type: FIELD_TYPES.TEXTAREA,
    validations: [
      {
        validator: emptyField(i18n.EMPTY_COMMENTS_NOT_ALLOWED),
      },
    ],
  },
};
