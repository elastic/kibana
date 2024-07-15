/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectOption } from '@elastic/eui';
import { EuiFormRow, EuiSelect } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import type { CasesConfigurationUI, CasesConfigurationUITemplate } from '../../containers/types';
import { OptionalFieldLabel } from '../optional_field_label';
import { TEMPLATE_HELP_TEXT, TEMPLATE_LABEL } from './translations';

interface Props {
  isLoading: boolean;
  templates: CasesConfigurationUI['templates'];
  onTemplateChange: (caseFields: CasesConfigurationUITemplate['caseFields']) => void;
}

export const TemplateSelectorComponent: React.FC<Props> = ({
  isLoading,
  templates,
  onTemplateChange,
}) => {
  const [selectedTemplate, onSelectTemplate] = useState<string>();

  const options: EuiSelectOption[] = templates.map((template) => ({
    text: template.name,
    value: template.key,
  }));

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      const selectedTemplated = templates.find((template) => template.key === e.target.value);

      if (selectedTemplated) {
        onSelectTemplate(selectedTemplated.key);
        onTemplateChange(selectedTemplated.caseFields);
      }
    },
    [onTemplateChange, templates]
  );

  return (
    <EuiFormRow
      id="createCaseTemplate"
      fullWidth
      label={TEMPLATE_LABEL}
      labelAppend={OptionalFieldLabel}
      helpText={TEMPLATE_HELP_TEXT}
    >
      <EuiSelect
        onChange={onChange}
        options={options}
        disabled={isLoading}
        isLoading={isLoading}
        data-test-subj="create-case-template-select"
        fullWidth
        value={selectedTemplate}
      />
    </EuiFormRow>
  );
};

TemplateSelectorComponent.displayName = 'TemplateSelector';

export const TemplateSelector = React.memo(TemplateSelectorComponent);
