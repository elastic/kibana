/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { fieldValidators } from '../../../../../../src/plugins/es_ui_shared/static/forms/helpers';
import { FIELD_TYPES } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/constants';
import type { FormSchema } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/types';
import type { CommentRequestUserType } from '../../../common/api/cases/comment';
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
        validator: emptyField(i18n.COMMENT_REQUIRED),
      },
    ],
  },
};
