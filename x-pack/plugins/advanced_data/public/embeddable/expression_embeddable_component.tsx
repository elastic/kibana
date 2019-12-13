/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexItem } from '@elastic/eui';

import { EuiText } from '@elastic/eui';
import { EuiFlexGrid } from '@elastic/eui';
import { withEmbeddableSubscription } from '../../../../../src/plugins/embeddable/public';
import { ExpressionEmbeddable, ExpressionInput, ExpressionOutput } from './expression_embeddable';

interface Props {
  embeddable: ExpressionEmbeddable;
  input: ExpressionInput;
  output: ExpressionOutput;
}

export function ExpressionEmbeddableComponentInner({ input: { expression } }: Props) {
  return (
    <EuiFlexItem>
      <EuiFlexGrid columns={1}>
        <EuiFlexItem>
          <EuiText data-test-subj="todoEmbeddableTitle" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText data-test-subj="todoEmbeddableTask" />
        </EuiFlexItem>
      </EuiFlexGrid>
    </EuiFlexItem>
  );
}

export const ExpressionEmbeddableComponent = withEmbeddableSubscription(
  ExpressionEmbeddableComponentInner
);
