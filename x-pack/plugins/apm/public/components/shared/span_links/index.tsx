/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiCallOut } from '@elastic/eui';
import React from 'react';
import { Span } from '../../../../typings/es_schemas/ui/span';

interface Props {
  span: Span;
}

export function SpanLinks({ span }: Props) {
  return (
    <EuiCallOut title="Proceed with caution!" iconType="help">
      <p>Here be dragons. Don&rsquo;t wanna mess with no dragons. And </p>
      <EuiButton href="#">Link button</EuiButton>
    </EuiCallOut>
  );
}
