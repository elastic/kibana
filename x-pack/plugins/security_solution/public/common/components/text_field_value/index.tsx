/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import React from 'react';

const trimTextOverflow = (text: string, maxLength?: number) => {
  if (maxLength !== undefined && text.length > maxLength) {
    return `${text.substr(0, maxLength)}...`;
  } else {
    return text;
  }
};

interface Props {
  fieldName: string;
  value: string;
  maxLength?: number;
  className?: string;
}

/*
 * Component to display text field value. Text field values can be large and need
 * programmatic truncation to a fixed text length. As text can be truncated the tooltip
 * is shown displaying the field name and full value. If the use case allows single
 * line truncation with CSS use eui-textTruncate class on this component instead of
 * maxLength property.
 */
export const TextFieldValue = ({ fieldName, value, maxLength, className }: Props) => {
  return (
    <EuiToolTip
      anchorClassName={className}
      content={
        <EuiFlexGroup data-test-subj="dates-container" direction="column" gutterSize="none">
          <EuiFlexItem grow={false}>{fieldName}</EuiFlexItem>
          <EuiFlexItem grow={false}>{value}</EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <span>{trimTextOverflow(value, maxLength)}</span>
    </EuiToolTip>
  );
};
