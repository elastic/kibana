/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { FieldConfig } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { memo } from 'react';
import { MAX_CATEGORY_LENGTH } from '../../../common/constants';
import type { CaseUI } from '../../../common/ui';
import { CategoryComponent } from './category_component';
import { CATEGORY, MAX_LENGTH_ERROR } from './translations';

interface Props {
  isLoading: boolean;
  availableCategories: string[];
}

const { maxLengthField } = fieldValidators;

const getIndexConfig = (): FieldConfig<CaseUI['category']> => ({
  validations: [
    {
      validator: maxLengthField({
        length: MAX_CATEGORY_LENGTH,
        message: MAX_LENGTH_ERROR('category', MAX_CATEGORY_LENGTH),
      }),
    },
  ],
});

const CategoryFormFieldComponent: React.FC<Props> = ({ isLoading, availableCategories }) => {
  return (
    <UseField<CaseUI['category']> path={'category'} config={getIndexConfig()}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        const onChange = (category: string) => {
          // TODO check empty string
          field.setValue(category);
        };

        return (
          <EuiFormRow label={CATEGORY} error={errorMessage} isInvalid={isInvalid} fullWidth>
            <CategoryComponent
              isLoading={isLoading}
              onChange={onChange}
              category={field.value}
              availableCategories={availableCategories}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

CategoryFormFieldComponent.displayName = 'CategoryFormFieldComponent';

export const CategoryFormField = memo(CategoryFormFieldComponent);
