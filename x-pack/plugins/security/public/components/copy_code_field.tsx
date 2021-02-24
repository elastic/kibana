/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFieldTextProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
} from '@elastic/eui';

export interface CopyCodeFieldProps extends Omit<EuiFieldTextProps, 'append'> {
  value: string;
}

export const CopyCodeField: FunctionComponent<CopyCodeFieldProps> = (props) => (
  <EuiFormControlLayout
    style={{ display: 'inline-flex', width: 'auto', backgroundColor: 'transparent' }}
    append={
      <EuiCopy textToCopy={props.value}>
        {(copyText) => (
          <EuiButtonIcon
            iconType="copyClipboard"
            color="success"
            style={{ backgroundColor: 'transparent' }}
            onClick={copyText}
          />
        )}
      </EuiCopy>
    }
    readOnly
  >
    <EuiFlexGroup
      responsive={false}
      gutterSize="none"
      alignItems="center"
      style={{ height: '100%' }}
    >
      <EuiFlexItem>
        <EuiCode transparentBackground style={{ color: 'white', padding: '1em' }}>
          {props.value}
        </EuiCode>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFormControlLayout>
);

CopyCodeField.defaultProps = {
  readOnly: true,
};
