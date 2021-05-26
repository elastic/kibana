/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, memo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ProcessorInternal } from '../../types';
import { getProcessorDescriptor } from '../shared';

interface Props {
  processor: ProcessorInternal;
}

export const ProcessorInformation: FunctionComponent<Props> = memo(({ processor }) => {
  const processorDescriptor = getProcessorDescriptor(processor.type);
  const label = processorDescriptor?.label ?? processor.type;
  const description =
    processor.options.description ?? processorDescriptor?.getDefaultDescription(processor.options);

  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText>
            <strong>{label}</strong>
          </EuiText>
        </EuiFlexItem>
        {description ? (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {description}
            </EuiText>
          </EuiFlexItem>
        ) : undefined}
      </EuiFlexGroup>
    </EuiPanel>
  );
});
