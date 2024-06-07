/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';

import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ComboBoxField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from './translations';
interface Props {
  isLoading: boolean;
  tags: string[];
}

const TemplateTagsComponent: React.FC<Props> = ({ isLoading, tags }) => {
  const options = tags.map((label) => ({
    label,
  }));

  return (
    <UseField
      path="templateTags"
      component={ComboBoxField}
      defaultValue={[]}
      componentProps={{
        idAria: 'template-tags',
        'data-test-subj': 'template-tags',
        euiFieldProps: {
          fullWidth: true,
          placeholder: '',
          disabled: isLoading,
          isLoading,
          options,
          noSuggestions: false,
          customOptionText: i18n.ADD_TAG_CUSTOM_OPTION_LABEL_COMBO_BOX,
        },
      }}
    />
  );
};

TemplateTagsComponent.displayName = 'TemplateTagsComponent';

export const TemplateTags = memo(TemplateTagsComponent);
