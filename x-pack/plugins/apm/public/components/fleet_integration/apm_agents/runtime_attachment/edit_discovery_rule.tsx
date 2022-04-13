/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiButton,
  EuiButtonEmpty,
  EuiFormFieldset,
  EuiSelect,
  EuiFieldText,
  EuiFormRow,
  EuiSuperSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  Operation,
  DISCOVERY_RULE_TYPE_ALL,
  STAGED_DISCOVERY_RULE_ID,
} from '.';

interface Props {
  id: string;
  onChangeOperation: (discoveryItemId: string) => void;
  operation: string;
  onChangeType: (discoveryItemId: string) => void;
  type: string;
  onChangeProbe: (discoveryItemId: string) => void;
  probe: string;
  onCancel: () => void;
  onSubmit: () => void;
  operationTypes: Operation[];
}

export function EditDiscoveryRule({
  id,
  onChangeOperation,
  operation,
  onChangeType,
  type,
  onChangeProbe,
  probe,
  onCancel,
  onSubmit,
  operationTypes,
}: Props) {
  return (
    <EuiPanel paddingSize="m" hasBorder={true}>
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiFormFieldset
            legend={{
              children: i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.editDisacoveryRule.operation',
                { defaultMessage: 'Operation' }
              ),
            }}
          >
            <EuiSelect
              options={operationTypes.map((item) => ({
                text: item.operation.label,
                value: item.operation.value,
              }))}
              value={operation}
              onChange={(e) => {
                onChangeOperation(e.target.value);
              }}
            />
          </EuiFormFieldset>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormFieldset
            legend={{
              children: i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.editDisacoveryRule.type',
                { defaultMessage: 'Type' }
              ),
            }}
          >
            <EuiFormRow
              fullWidth
              helpText={i18n.translate(
                'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.editRule.helpText',
                {
                  defaultMessage: 'Choose from allowed parameters',
                }
              )}
            >
              <EuiSuperSelect
                hasDividers
                fullWidth
                options={
                  operationTypes
                    .find(
                      ({ operation: definedOperation }) =>
                        definedOperation.value === operation
                    )
                    ?.types.map((item) => ({
                      inputDisplay: item.label,
                      value: item.value,
                      dropdownDisplay: (
                        <>
                          <strong>{item.label}</strong>
                          <EuiText size="s" color="subdued">
                            <p>{item.description}</p>
                          </EuiText>
                        </>
                      ),
                    })) ?? []
                }
                valueOfSelected={type}
                onChange={onChangeType}
              />
            </EuiFormRow>
          </EuiFormFieldset>
        </EuiFlexItem>
      </EuiFlexGroup>
      {type !== DISCOVERY_RULE_TYPE_ALL && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormFieldset
              legend={{
                children: i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.editDisacoveryRule.probe',
                  { defaultMessage: 'Probe' }
                ),
              }}
            >
              <EuiFormRow
                fullWidth
                helpText={i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.editRule.probeValue',
                  {
                    defaultMessage: 'Enter the probe value',
                  }
                )}
              >
                <EuiFieldText
                  fullWidth
                  value={probe}
                  onChange={(e) => onChangeProbe(e.target.value)}
                />
              </EuiFormRow>
            </EuiFormFieldset>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty onClick={onCancel}>Cancel</EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            onClick={onSubmit}
            fill
            disabled={type === DISCOVERY_RULE_TYPE_ALL ? false : probe === ''}
          >
            {id === STAGED_DISCOVERY_RULE_ID
              ? i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.editRule.add',
                  { defaultMessage: 'Add' }
                )
              : i18n.translate(
                  'xpack.apm.fleetIntegration.apmAgent.runtimeAttachment.editRule.save',
                  { defaultMessage: 'Save' }
                )}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
