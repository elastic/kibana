/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormSchema } from 'ui/forms/use_form';
import { emptyField, minLengthField } from 'ui/forms/field_validators';
import { MyForm } from './types';

export const formSchema: FormSchema<MyForm> = {
  name: {
    label: 'Name',
    validations: [
      {
        validator: emptyField,
        message: 'Custom error message, the name cannot be empty.',
      },
    ],
  },
  title: {
    label: 'Title',
    validations: [
      {
        validator: emptyField,
      },
      {
        validator: minLengthField(5),
        message: ({ length }) => `Custom message title: must have minimum length of ${length}`,
      },
    ],
  },
  nested: {
    prop: {
      label: 'Nested prop',
      validations: [
        {
          validator: ({ formData }) => {
            // Inline validator reading form Data
            if (formData.title.length === 7) {
              return;
            }
            return {
              code: 'ERR_INVALID_TITLE',
              message: 'This field is valid if the title has 7 characters.',
            };
          },
        },
      ],
    },
  },
};
