import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiToken } from '@elastic/eui';
import { ResultFieldProps } from './types';

export const ResultField: React.FC<ResultFieldProps> = ({
  iconType = 'tokenString',
  fieldName,
  fieldValue,
}) => {
  return (
    <EuiFlexItem className="resultField">
      <EuiFlexGroup alignItems="center" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiToken iconType={iconType} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="xs">{fieldName}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sortRight" color="subdued" />
        </EuiFlexItem>
        <EuiFlexItem grow={4}>
          <EuiText size="xs">{fieldValue}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  )
}
