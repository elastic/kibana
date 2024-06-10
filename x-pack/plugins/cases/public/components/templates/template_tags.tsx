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
import { schema } from './schema';
interface Props {
  isLoading: boolean;
  currentTags: string[];
  tagOptions: string[];
}

const TemplateTagsComponent: React.FC<Props> = ({ isLoading, currentTags, tagOptions }) => {
  const options = tagOptions.map((label) => ({
    label,
  }));

  const templateTagsConfig = {
    ...schema.templateTags,
    defaultValue: currentTags ?? [],
  };

  return (
    <UseField
      path="templateTags"
      component={ComboBoxField}
      config={templateTagsConfig}
      componentProps={{
        idAria: 'template-tags',
        'data-test-subj': 'template-tags',
        euiFieldProps: {
          placeholder: '',
          fullWidth: true,
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
