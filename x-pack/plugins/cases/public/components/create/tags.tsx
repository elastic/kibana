/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';

import { getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { useGetTags } from '../../containers/use_get_tags';
import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface Props {
  isLoading: boolean;
}

const TagsComponent: React.FC<Props> = ({ isLoading }) => {
  const { data: tagOptions = [], isLoading: isLoadingTags } = useGetTags();
  const options = useMemo(
    () =>
      tagOptions.map((label) => ({
        label,
      })),
    [tagOptions]
  );

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
          customOptionText: i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX,
        },
      }}
    />
  );
};

TagsComponent.displayName = 'TagsComponent';

export const Tags = memo(TagsComponent);
