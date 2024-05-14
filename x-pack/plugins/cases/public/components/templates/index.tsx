/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiPanel,
  EuiDescribedFormGroup,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { useCasesContext } from '../cases_context/use_cases_context';
import { ExperimentalBadge } from '../experimental_badge/experimental_badge';
import type { CasesConfigurationUITemplate } from '../../../common/ui';
import * as i18n from './translations';
import { TemplatesList } from './templates_list';

interface Props {
  disabled: boolean;
  isLoading: boolean;
  templates: CasesConfigurationUITemplate[];
  handleAddTemplate: () => void;
}

const TemplatesComponent: React.FC<Props> = ({
  disabled,
  isLoading,
  templates,
  handleAddTemplate,
}) => {
  const { permissions } = useCasesContext();
  const canAddTemplates = permissions.create && permissions.update;

  const onAddCustomField = useCallback(() => {
    // if (customFields.length === MAX_CUSTOM_FIELDS_PER_CASE && !error) {
    //   setError(true);
    //   return;
    // }

    handleAddTemplate();
    // setError(false);
  }, [handleAddTemplate]);

  return (
    <EuiDescribedFormGroup
      fullWidth
      title={
        <EuiFlexGroup alignItems="center" gutterSize="none">
          <EuiFlexItem grow={false}>{i18n.TEMPLATE_TITLE}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExperimentalBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      description={<p>{i18n.TEMPLATE_DESCRIPTION}</p>}
      data-test-subj="templates-form-group"
    >
      <EuiPanel paddingSize="s" color="subdued" hasBorder={false} hasShadow={false}>
        {templates.length ? (
          <>
            <TemplatesList templates={templates} />
            {/* {error ? (
              <EuiFlexGroup justifyContent="center">
                <EuiFlexItem grow={false}>
                  <EuiText color="danger">
                    {i18n.MAX_CUSTOM_FIELD_LIMIT(MAX_CUSTOM_FIELDS_PER_CASE)}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            ) : null} */}
          </>
        ) : null}
        <EuiSpacer size="m" />
        {!templates.length ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false} data-test-subj="empty-templates">
              {i18n.NO_TEMPLATES}
              <EuiSpacer size="m" />
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
        {canAddTemplates ? (
          <EuiFlexGroup justifyContent="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                isLoading={isLoading}
                isDisabled={disabled}
                size="s"
                onClick={onAddCustomField}
                iconType="plusInCircle"
                data-test-subj="add-template"
              >
                {i18n.ADD_TEMPLATE}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        ) : null}
      </EuiPanel>
    </EuiDescribedFormGroup>
  );
};

TemplatesComponent.displayName = 'Templates';

export const Templates = React.memo(TemplatesComponent);
