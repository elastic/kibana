/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiButtonIcon, EuiCopy, EuiFieldText, EuiFieldTextProps } from '@elastic/eui';

export interface FieldTextWithCopyButtonProps extends Omit<EuiFieldTextProps, 'append'> {
  value: string;
}

export const FieldTextWithCopyButton: FunctionComponent<FieldTextWithCopyButtonProps> = (props) => (
  <EuiFieldText
    {...props}
    append={
      <EuiCopy textToCopy={props.value}>
        {(copyText) => (
          <EuiButtonIcon
            iconType="copyClipboard"
            color={props.readOnly ? 'text' : undefined}
            style={props.readOnly ? { backgroundColor: 'transparent' } : undefined}
            onClick={copyText}
          />
        )}
      </EuiCopy>
    }
  />
);

FieldTextWithCopyButton.defaultProps = {
  readOnly: true,
};
