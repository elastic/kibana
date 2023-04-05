/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
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
        autoFocus: true,
        fullWidth: true,
        disabled: isLoading,
      },
    }}
  />
);

TitleComponent.displayName = 'TitleComponent';

export const Title = memo(TitleComponent);
