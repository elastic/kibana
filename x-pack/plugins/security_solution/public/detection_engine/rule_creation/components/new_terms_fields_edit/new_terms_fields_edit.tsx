/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ERROR_CODE, ValidationFunc } from '../../../../shared_imports';
import { FIELD_TYPES, UseField } from '../../../../shared_imports';
import { NewTermsFieldsField } from './new_terms_fields_field';
import { newTermsFieldsValidatorFactory } from '../../../rule_creation_ui/validators/new_terms_fields_validator_factory';

interface NewTermsFieldsEditProps {
  path: string;
  fieldNames: string[];
}

export const NewTermsFieldsEdit = memo(function NewTermsFieldsEdit({
  path,
  fieldNames,
}: NewTermsFieldsEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      config={NEW_TERMS_FIELDS_CONFIG}
      component={NewTermsFieldsField}
      componentProps={{ fieldNames }}
    />
  );
});

const NEW_TERMS_FIELDS_CONFIG = {
  type: FIELD_TYPES.COMBO_BOX,
  label: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.newTermsFieldsLabel',
    {
      defaultMessage: 'Fields',
    }
  ),
  helpText: i18n.translate(
    'xpack.securitySolution.detectionEngine.createRule.stepAboutRule.fieldNewTermsFieldHelpText',
    {
      defaultMessage: 'Select a field to check for new terms.',
    }
  ),
  validations: [
    {
      validator: (
        ...args: Parameters<ValidationFunc>
      ): ReturnType<ValidationFunc<{}, ERROR_CODE>> | undefined => {
        return newTermsFieldsValidatorFactory(...args);
      },
    },
  ],
};
