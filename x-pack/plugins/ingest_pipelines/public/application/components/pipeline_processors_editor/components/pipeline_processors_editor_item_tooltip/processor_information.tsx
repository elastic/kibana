/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, memo } from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { ProcessorInternal } from '../../types';
import { getProcessorDescriptor } from '../shared';

interface Props {
  processor: ProcessorInternal;
}

export const ProcessorInformation: FunctionComponent<Props> = memo(({ processor }) => {
  const label = getProcessorDescriptor(processor.type)?.label ?? processor.type;
  return (
    <EuiPanel>
      <EuiFlexGroup justifyContent="center" alignItems="center" responsive={false} gutterSize="s">
        <EuiFlexItem grow={false}>
          <b>{label}</b>
        </EuiFlexItem>
        {processor.options.description ? (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="m">
              {processor.options.description}
            </EuiText>
          </EuiFlexItem>
        ) : undefined}
      </EuiFlexGroup>
    </EuiPanel>
  );
});
