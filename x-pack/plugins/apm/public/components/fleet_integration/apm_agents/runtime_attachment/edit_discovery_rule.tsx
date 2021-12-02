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
        <EuiFlexItem grow={false}>
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
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormFieldset legend={{ children: 'Type' }}>
            <EuiFormRow fullWidth helpText="Choose from allowed params">
              <EuiSuperSelect
                hasDividers
                fullWidth
                options={
                  operationTypes
                    .find(
                      ({ operation: definedOperation }) =>
                        definedOperation.value === operation
                    )
                    ?.types.map((type) => ({
                      inputDisplay: type.label,
                      value: type.value,
                      dropdownDisplay: (
                        <>
                          <strong>{type.label}</strong>
                          <EuiText size="s" color="subdued">
                            <p>{type.description}</p>
                          </EuiText>
                        </>
                      ),
                    })) ?? []
                }
                valueOfSelected={type}
                onChange={(value) => {
                  onChangeType(value);
                }}
              />
            </EuiFormRow>
          </EuiFormFieldset>
        </EuiFlexItem>
      </EuiFlexGroup>
      {type !== DISCOVERY_RULE_TYPE_ALL && (
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormFieldset legend={{ children: 'Probe' }}>
              <EuiFormRow fullWidth helpText="Enter the probe value">
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
            {id === STAGED_DISCOVERY_RULE_ID ? 'Add' : 'Save'}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
