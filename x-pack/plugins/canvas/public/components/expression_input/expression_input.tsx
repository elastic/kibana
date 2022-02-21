/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';

import {
  LazyExpressionInput,
  ExpressionInputProps,
  withSuspense,
} from '../../../../../../src/plugins/presentation_util/public';

interface Props extends Omit<ExpressionInputProps, 'height'> {
  /** Optional string for displaying error messages */
  error?: string;
}

const Input = withSuspense(LazyExpressionInput);

export const ExpressionInput = ({ error, ...rest }: Props) => {
  return (
    <div className="canvasExpressionInput">
      <EuiFormRow
        className="canvasExpressionInput__inner"
        fullWidth
        isInvalid={Boolean(error)}
        error={error}
      >
        <div className="canvasExpressionInput__editor">
          <Input height="100%" {...rest} />
        </div>
      </EuiFormRow>
    </div>
  );
};
