/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import * as i18n from './translations';
import { EditActionCallback } from '../types';

interface TagsProps {
  onChange: EditActionCallback;
  values: string[];
}

const TagsComponent: React.FC<TagsProps> = ({ onChange, values }) => {
  const tagOptions = useMemo(() => values.map((value) => getTagAsOption(value)), [values]);

  const onCreateOption = useCallback(
    (tagValue: string) => {
      const newTags = [...tagOptions, getTagAsOption(tagValue)];
      onChange(
        'tags',
        newTags.map((tag) => tag.label)
      );
    },
    [onChange, tagOptions]
  );

  const onTagsChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      onChange(
        'tags',
        newOptions.map((option) => option.label)
      );
    },
    [onChange]
  );

  return (
    <EuiFormRow
      data-test-subj="opsgenie-tags-row"
      fullWidth
      label={i18n.TAGS_FIELD_LABEL}
      helpText={i18n.TAGS_HELP}
    >
      <EuiComboBox
        fullWidth
        isClearable
        noSuggestions
        selectedOptions={tagOptions}
        onCreateOption={onCreateOption}
        onChange={onTagsChange}
        data-test-subj="opsgenie-tags"
      />
    </EuiFormRow>
  );
};

TagsComponent.displayName = 'Tags';

export const Tags = React.memo(TagsComponent);

const getTagAsOption = (value: string) => ({ label: value, key: value });
