/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { isEqual } from 'lodash/fp';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { Field, getUseField, FormDataProvider } from '../../../shared_imports';

const CommonUseField = getUseField({ component: Field });

interface Props {
  isLoading: boolean;
  options: Array<EuiComboBoxOptionOption<string>>;
  setOptions: (options: Array<EuiComboBoxOptionOption<string>>) => void;
}

const TagsComponent: React.FC<Props> = ({ isLoading, options, setOptions }) => (
  <>
    <CommonUseField
      path="tags"
      componentProps={{
        idAria: 'caseTags',
        'data-test-subj': 'caseTags',
        euiFieldProps: {
          fullWidth: true,
          placeholder: '',
          disabled: isLoading,
          options,
          noSuggestions: false,
        },
      }}
    />
    <FormDataProvider pathsToWatch="tags">
      {({ tags: anotherTags }) => {
        const current: string[] = options.map((opt) => opt.label);
        const newOptions = anotherTags.reduce((acc: string[], item: string) => {
          if (!acc.includes(item)) {
            return [...acc, item];
          }
          return acc;
        }, current);
        if (!isEqual(current, newOptions)) {
          setOptions(
            newOptions.map((label: string) => ({
              label,
            }))
          );
        }
        return null;
      }}
    </FormDataProvider>
  </>
);

export const Tags = memo(TagsComponent);
