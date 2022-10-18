/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';

import * as i18n from './translations';
import { EditActionCallback } from './types';

interface TagsProps {
  onChange: EditActionCallback;
}

const TagsComponent: React.FC<TagsProps> = ({ onChange }) => {
  const [selectedOptions, setSelected] = useState<EuiComboBoxOptionOption[]>([]);

  const onCreateOption = useCallback(
    (tagValue: string) => {
      const newOption = {
        label: tagValue,
        key: tagValue,
      };

      const newTags = [...selectedOptions, newOption];
      setSelected(newTags);
      onChange(
        'tags',
        newTags.map((tag) => tag.label)
      );
    },
    [onChange, selectedOptions]
  );

  const onTagsChange = useCallback(
    (newOptions: EuiComboBoxOptionOption[]) => {
      setSelected(newOptions);
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
        selectedOptions={selectedOptions}
        onCreateOption={onCreateOption}
        onChange={onTagsChange}
      />
    </EuiFormRow>
  );
};

TagsComponent.displayName = 'Tags';

export const Tags = React.memo(TagsComponent);
