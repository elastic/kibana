/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect, useState } from 'react';
import { isEqual } from 'lodash/fp';

import { Field, getUseField, useFormData } from '../../../shared_imports';
import { useGetTags } from '../../containers/use_get_tags';

const CommonUseField = getUseField({ component: Field });

interface Props {
  isLoading: boolean;
}

const TagsComponent: React.FC<Props> = ({ isLoading }) => {
  const { tags: tagOptions, isLoading: isLoadingTags } = useGetTags();
  const [options, setOptions] = useState(
    tagOptions.map((label) => ({
      label,
    }))
  );

  // This values uses useEffect to update, not useMemo,
  // because we need to setState on it from the jsx
  useEffect(
    () =>
      setOptions(
        tagOptions.map((label) => ({
          label,
        }))
      ),
    [tagOptions]
  );

  const [{ tags: currentTags }] = useFormData<{ tags: string[] }>({
    watch: ['tags'],
  });

  useEffect(() => {
    if (currentTags) {
      const current: string[] = options.map((opt) => opt.label);
      const newOptions = currentTags.reduce((acc: string[], item: string) => {
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
    }
  }, [currentTags, options]);

  return (
    <CommonUseField
      path="tags"
      componentProps={{
        idAria: 'caseTags',
        'data-test-subj': 'caseTags',
        euiFieldProps: {
          fullWidth: true,
          placeholder: '',
          disabled: isLoading || isLoadingTags,
          options,
          noSuggestions: false,
        },
      }}
    />
  );
};

export const Tags = memo(TagsComponent);
