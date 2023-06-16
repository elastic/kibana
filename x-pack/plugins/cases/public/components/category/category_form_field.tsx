/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow } from '@elastic/eui';
import {
  UseField,
  getFieldValidityAndErrorMessage,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { memo } from 'react';
import type { CaseUI } from '../../../common/ui';
import { CategoryComponent } from './category_component';
import { CATEGORY } from './translations';

interface Props {
  isLoading: boolean;
  availableCategories: string[];
}

const CategoryFormFieldComponent: React.FC<Props> = ({ isLoading, availableCategories }) => {
  return (
    <UseField<CaseUI['category']> path={'category'}>
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
