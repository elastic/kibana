/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { Field } from '../../../../../../src/plugins/es_ui_shared/static/forms/components/field';
import { getUseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';

const CommonUseField = getUseField({ component: Field });

interface Props {
  isLoading: boolean;
}

const TitleComponent: React.FC<Props> = ({ isLoading }) => (
  <CommonUseField
    path="title"
    componentProps={{
      idAria: 'caseTitle',
      'data-test-subj': 'caseTitle',
      euiFieldProps: {
        fullWidth: true,
        disabled: isLoading,
      },
    }}
  />
);

TitleComponent.displayName = 'TitleComponent';

export const Title = memo(TitleComponent);
