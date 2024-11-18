/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ERROR_CODE,
  FormData,
  FormSchema,
  ValidationFunc,
} from '../../../../../../../../shared_imports';
import { RuleFieldEditFormWrapper } from '../rule_field_edit_form_wrapper';
import { NewTermsFieldsEditAdapter } from './new_terms_fields_edit_adapter';
import { type NewTermsFields } from '../../../../../../../../../common/api/detection_engine';
import { schema } from '../../../../../../../rule_creation_ui/components/step_define_rule/schema';
import { newTermsFieldsValidatorFactory } from '../../../../../../../rule_creation_ui/validators/new_terms_fields_validator_factory';

export function NewTermsFieldsEditForm(): JSX.Element {
  return (
    <RuleFieldEditFormWrapper
      component={NewTermsFieldsEditAdapter}
      ruleFieldFormSchema={newTermsFormSchema}
      deserializer={deserializer}
      serializer={serializer}
    />
  );
}

interface NewTermsFieldsFormData {
  newTermsFields: string[];
}

function deserializer(defaultValue: FormData): NewTermsFieldsFormData {
  return {
    newTermsFields: defaultValue.new_terms_fields,
  };
}

function serializer(formData: FormData): { new_terms_fields: NewTermsFields } {
  return {
    new_terms_fields: formData.newTermsFields,
  };
}

export const newTermsFormSchema = {
  newTermsFields: {
    ...schema.newTermsFields,
    validations: [
      {
        validator: (
          ...args: Parameters<ValidationFunc>
        ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
          return newTermsFieldsValidatorFactory(...args);
        },
      },
    ],
  },
} as FormSchema<{
  newTermsFields: NewTermsFields;
}>;
