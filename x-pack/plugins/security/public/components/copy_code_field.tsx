/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonIcon,
  EuiCode,
  EuiCopy,
  EuiFieldTextProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
} from '@elastic/eui';
import { useTheme } from './use_theme';

export interface CopyCodeFieldProps extends Omit<EuiFieldTextProps, 'append'> {
  value: string;
}

export const CopyCodeField: FunctionComponent<CopyCodeFieldProps> = (props) => {
  const theme = useTheme();

  return (
    <EuiFormControlLayout
      style={{ display: 'inline-flex', width: 'auto', backgroundColor: 'transparent' }}
      append={
        <EuiCopy textToCopy={props.value}>
          {(copyText) => (
            <EuiButtonIcon
              aria-label={i18n.translate('xpack.security.copyCodeField.copyButton', {
                defaultMessage: 'Copy code',
              })}
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
          <EuiCode
            transparentBackground
            style={{ color: theme.euiColorSuccessText, padding: theme.euiFormControlPadding }}
          >
            {props.value}
          </EuiCode>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormControlLayout>
  );
};

CopyCodeField.defaultProps = {
  readOnly: true,
};
