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
} from '@elastic/eui';
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
    <EuiPanel paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Operation' }}>
            <EuiSelect
              options={operationTypes.map(({ operation }) => ({
                text: operation.label,
                value: operation.value,
              }))}
              value={operation}
              onChange={(e) => {
                onChangeOperation(e.target.value);
              }}
            />
          </EuiFormFieldset>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Type' }}>
            <EuiFormRow helpText="Choose from allowed params">
              <EuiSelect
                options={operationTypes
                  .find(
                    ({ operation: definedOperation }) =>
                      definedOperation.value === operation
                  )
                  ?.types.map((type) => ({
                    text: type.label,
                    value: type.value,
                  }))}
                value={type}
                onChange={(e) => {
                  onChangeType(e.target.value);
                }}
              />
            </EuiFormRow>
          </EuiFormFieldset>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormFieldset
            legend={{ children: 'Probe' }}
            style={{
              visibility:
                type === DISCOVERY_RULE_TYPE_ALL ? 'hidden' : undefined,
            }}
          >
            <EuiFormRow helpText="Enter the probe value">
              <EuiFieldText
                value={probe}
                onChange={(e) => onChangeProbe(e.target.value)}
              />
            </EuiFormRow>
          </EuiFormFieldset>
        </EuiFlexItem>
      </EuiFlexGroup>
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
            {id === STAGED_DISCOVERY_RULE_ID ? 'Add' : 'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
