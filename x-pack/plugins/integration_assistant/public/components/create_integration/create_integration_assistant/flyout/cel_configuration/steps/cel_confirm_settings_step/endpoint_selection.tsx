/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiRadioGroupOption, EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiRadioGroup } from '@elastic/eui';
import type { IntegrationSettings } from '../../../../types';

const loadPaths = (integrationSettings: IntegrationSettings | undefined): string[] => {
  const pathObjs = integrationSettings?.apiSpec?.getPaths();
  if (!pathObjs) {
    throw new Error('Unable to parse path options from OpenAPI spec');
  }
  return Object.keys(pathObjs).filter((path) => pathObjs[path].get);
};

interface EndpointSelectionProps {
  integrationSettings: IntegrationSettings | undefined;
  pathSuggestions: string[];
  selectedPath: string | undefined;
  selectedOtherPath: string | undefined;
  useOtherEndpoint: boolean;
  onChangeSuggestedPath(id: string): void;
  onChangeOtherPath(path: EuiComboBoxOptionOption[]): void;
}

export const EndpointSelection = React.memo<EndpointSelectionProps>(
  ({
    integrationSettings,
    pathSuggestions,
    selectedPath,
    selectedOtherPath,
    useOtherEndpoint,
    onChangeSuggestedPath,
    onChangeOtherPath,
  }) => {
    const allPaths = loadPaths(integrationSettings);
    const otherPathOptions = allPaths.map<EuiComboBoxOptionOption>((p) => ({ label: p }));

    const options = pathSuggestions
      .concat(['Enter manually'])
      .map<EuiRadioGroupOption>((option, index) =>
        // The LLM returns the path in preference order, so we know the first option is the recommended one
        index === 0
          ? { id: option, label: `${option} (recommended)` }
          : { id: option, label: option }
      );

    return (
      <EuiFlexGroup direction="column" gutterSize="l" data-test-subj="confirmSettingsStep">
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiRadioGroup
              options={options}
              idSelected={selectedPath}
              onChange={onChangeSuggestedPath}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        {useOtherEndpoint && (
          <EuiFlexGroup direction="column">
            <EuiFormRow label={'Choose API endpoint'} fullWidth>
              <EuiComboBox
                singleSelection={{ asPlainText: true }}
                fullWidth
                options={otherPathOptions}
                selectedOptions={
                  selectedOtherPath === undefined ? undefined : [{ label: selectedOtherPath }]
                }
                onChange={onChangeOtherPath}
              />
            </EuiFormRow>
          </EuiFlexGroup>
        )}
      </EuiFlexGroup>
    );
  }
);
EndpointSelection.displayName = 'EndpointSelection';
