/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { MarkdownEditorForm } from '../../../common/components/markdown_editor/eui_form';
import { UseField } from '../../../shared_imports';

interface Props {
  isLoading: boolean;
}

export const fieldName = 'description';

const DescriptionComponent: React.FC<Props> = ({ isLoading }) => (
  <UseField
    path={fieldName}
    component={MarkdownEditorForm}
    componentProps={{
      dataTestSubj: 'caseDescription',
      idAria: 'caseDescription',
      isDisabled: isLoading,
    }}
  />
);

DescriptionComponent.displayName = 'DescriptionComponent';

export const Description = memo(DescriptionComponent);
