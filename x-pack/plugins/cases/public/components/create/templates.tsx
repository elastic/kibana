/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiFlexGroup,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import type { CasesConfigurationUI, CasesConfigurationUITemplate } from '../../containers/types';
import { OptionalFieldLabel } from '../optional_field_label';
import { TEMPLATE_HELP_TEXT, TEMPLATE_LABEL } from './translations';

interface Props {
  isLoading: boolean;
  templates: CasesConfigurationUI['templates'];
  initialTemplate?: CasesConfigurationUI['templates'][number];
  onTemplateChange: ({
    caseFields,
    key,
  }: Pick<CasesConfigurationUITemplate, 'caseFields' | 'key'>) => void;
}

export const TemplateSelectorComponent: React.FC<Props> = ({
  isLoading,
  templates,
  initialTemplate,
  onTemplateChange,
}) => {
  const [selectedTemplate, onSelectTemplate] = useState<string | undefined>(
    initialTemplate?.key ?? undefined
  );
  const isSmallScreen = useIsWithinMaxBreakpoint('s');

  const options: EuiSelectOption[] = templates.map((template) => ({
    text: template.name,
    value: template.key,
  }));

  const onChange: React.ChangeEventHandler<HTMLSelectElement> = useCallback(
    (e) => {
      const updatedTemplate = templates.find((template) => template.key === e.target.value);

      if (updatedTemplate) {
        onSelectTemplate(updatedTemplate.key);
        onTemplateChange({ key: updatedTemplate.key, caseFields: updatedTemplate.caseFields });
      }
    },
    [onTemplateChange, templates]
  );

  return (
    <EuiFormRow
      id="createCaseTemplate"
      fullWidth
      label={TEMPLATE_LABEL}
      labelAppend={
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          css={css`
            flex-grow: 0;
          `}
          responsive={false}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              line-height: 0;
            `}
          >
            <ExperimentalBadge compact={isSmallScreen} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{OptionalFieldLabel}</EuiFlexItem>
        </EuiFlexGroup>
      }
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
