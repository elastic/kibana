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
}: Props) {
  return (
    <EuiPanel paddingSize="m">
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Operation' }}>
            <EuiSelect
              options={[
                { text: 'Include', value: 'Include' },
                { text: 'Exclude', value: 'Exclude' },
              ]}
              value={operation}
              onChange={(e) => {
                onChangeOperation(
                  e.target.selectedIndex === 0 ? 'Include' : 'Exclude'
                );
              }}
            />
          </EuiFormFieldset>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Type' }}>
            <EuiFormRow helpText="Choose from allowed params">
              <EuiSelect
                options={[
                  { text: 'main', value: 'main' },
                  { text: 'pid', value: 'pid' },
                ]}
                value={type}
                onChange={(e) => {
                  onChangeType(e.target.selectedIndex === 0 ? 'main' : 'pid');
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
            {id === 'new' ? 'Add' : 'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
