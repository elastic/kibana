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
import { STAGED_DISCOVERY_RULE_ID } from '.';

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
  operations: string[];
  types: string[];
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
  operations,
  types,
}: Props) {
  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Operation' }}>
            <EuiSelect
              options={operations.map((operation) => ({
                text: operation,
                value: operation,
              }))}
              value={operation}
              onChange={(e) => {
                onChangeOperation(operations[e.target.selectedIndex]);
              }}
            />
          </EuiFormFieldset>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Type' }}>
            <EuiFormRow helpText="Choose from allowed params">
              <EuiSelect
                options={types.map((type) => ({
                  text: type,
                  value: type,
                }))}
                value={type}
                onChange={(e) => {
                  onChangeType(types[e.target.selectedIndex]);
                }}
              />
            </EuiFormRow>
          </EuiFormFieldset>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Probe' }}>
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
          <EuiButton onClick={onSubmit} fill disabled={probe === ''}>
            {id === STAGED_DISCOVERY_RULE_ID ? 'Add' : 'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
