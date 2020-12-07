/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { Field, getUseField } from '../../../shared_imports';

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
