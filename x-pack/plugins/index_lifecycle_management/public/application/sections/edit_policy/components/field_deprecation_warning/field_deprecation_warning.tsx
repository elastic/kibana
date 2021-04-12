/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip } from '@elastic/eui';

interface Props {
  message: string;
  isShowing: boolean;
  children: React.ReactNode;
  'data-test-subj'?: string;
}

import './field_deprecation_warning.scss';

/**
 * Annotate an EuiFormField component with an alert indication to inform users that a field is
 * deprecated.
 */
export const FieldDeprecationWarning: FunctionComponent<Props> = ({
  message,
  isShowing,
  children: fieldComponent,
  ...rest
}) => {
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {isShowing && (
        <EuiFlexItem
          data-test-subj={rest['data-test-subj']}
          grow={false}
          className="ilmFieldDeprecationWarning__iconContainer"
        >
          <EuiIconTip type="alert" color="warning" content={message} />
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>{fieldComponent}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
