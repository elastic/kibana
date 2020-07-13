/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonEmpty,
} from '@elastic/eui';

import { ComponentTemplateListItem } from '../../../../../common';
import { Forms } from '../../../../shared_imports';
import { ComponentTemplatesSelector } from '../../component_templates';

interface Props {
  esDocsBase: string;
  onChange: (content: Forms.Content) => void;
  defaultValue?: string[];
}

const i18nTexts = {
  title: (
    <FormattedMessage
      id="xpack.idxMgmt.formWizard.stepComponents.stepTitle"
      defaultMessage="Component templates (optional)"
    />
  ),
  description: (
    <FormattedMessage
      id="xpack.idxMgmt.formWizard.stepComponents.componentsDescription"
      defaultMessage="Components templates let you save index settings, mappings and aliases and inherit from them in index templates."
    />
  ),
};

export const StepComponents = ({ defaultValue = [], onChange, esDocsBase }: Props) => {
  const [state, setState] = useState<{
    isLoadingComponents: boolean;
    components: ComponentTemplateListItem[];
  }>({ isLoadingComponents: true, components: [] });

  const onComponentsLoaded = useCallback((components: ComponentTemplateListItem[]) => {
    setState({ isLoadingComponents: false, components });
  }, []);

  const onComponentSelectionChange = useCallback(
    (components: string[]) => {
      onChange({
        isValid: true,
        validate: async () => true,
        getData: () => (components.length > 0 ? components : undefined),
      });
    },
    [onChange]
  );

  const showHeader = state.isLoadingComponents === true || state.components.length > 0;
  const docUri = `${esDocsBase}/indices-component-template.html`;

  const renderHeader = () => {
    if (!showHeader) {
      return null;
    }

    return (
      <>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiTitle>
              <h2 data-test-subj="stepTitle">{i18nTexts.title}</h2>
            </EuiTitle>

            <EuiSpacer size="s" />

            <EuiText>
              <p>{i18nTexts.description}</p>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" flush="right" href={docUri} target="_blank" iconType="help">
              <FormattedMessage
                id="xpack.idxMgmt.formWizard.stepComponents.docsButtonLabel"
                defaultMessage="Component templates docs"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />
      </>
    );
  };

  return (
    <div data-test-subj="stepComponents">
      {renderHeader()}

      <ComponentTemplatesSelector
        defaultValue={defaultValue}
        onChange={onComponentSelectionChange}
        onComponentsLoaded={onComponentsLoaded}
        docUri={docUri}
        emptyPrompt={{
          text: i18nTexts.description,
          showCreateButton: false,
        }}
      />
    </div>
  );
};
