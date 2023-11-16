/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormRowProps,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

type OptionalFormRowProps = EuiFormRowProps;

export function OptionalFormRow(props: OptionalFormRowProps) {
  const { euiTheme } = useEuiTheme();

  const { label, children, helpText } = props;
  return (
    <EuiFormRow
      css={{
        '.euiFormLabel': {
          width: '100%',
        },
        '.euiFormLabel > .euiFlexGroup > div:last-of-type': {
          fontWeight: 'normal',
          color: euiTheme.colors.subduedText,
        },
      }}
      label={
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>{label}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            {i18n.translate('xpack.observability_onboarding.form.optional', {
              defaultMessage: 'Optional',
            })}
          </EuiFlexItem>
        </EuiFlexGroup>
      }
      helpText={helpText}
    >
      {children}
    </EuiFormRow>
  );
}
