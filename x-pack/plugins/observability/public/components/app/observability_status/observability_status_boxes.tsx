/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTitle, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  CompletedStatusBox,
  EmptyStatusBox,
  ObservabilityStatusBoxProps,
} from './observability_status_box';
export interface ObservabilityStatusProps {
  boxes: ObservabilityStatusBoxProps[];
}

const sortingFn = (a: ObservabilityStatusBoxProps, b: ObservabilityStatusBoxProps) => {
  return a.weight - b.weight;
};

export function ObservabilityStatusBoxes({ boxes }: ObservabilityStatusProps) {
  const hasDataBoxes = boxes.filter((box) => box.hasData).sort(sortingFn);
  const noHasDataBoxes = boxes.filter((box) => !box.hasData).sort(sortingFn);

  return (
    <EuiFlexGroup direction="column">
      {noHasDataBoxes.length > 0 && (
        <>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.observability.status.recommendedSteps"
                  defaultMessage="Recommended next steps"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {noHasDataBoxes.map((box) => (
            <EuiFlexItem key={box.id} data-test-id={`box-${box.id}`}>
              <EmptyStatusBox {...box} />
            </EuiFlexItem>
          ))}
        </>
      )}

      {noHasDataBoxes.length > 0 && hasDataBoxes.length > 0 && <EuiHorizontalRule />}

      {hasDataBoxes.length > 0 && (
        <>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h2>
                <FormattedMessage
                  id="xpack.observability.status.dataAvailableTitle"
                  defaultMessage="Data available for"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          {hasDataBoxes.map((box) => (
            <EuiFlexItem key={box.id} data-test-subj={`box-${box.id}`}>
              <CompletedStatusBox {...box} />
            </EuiFlexItem>
          ))}
        </>
      )}
    </EuiFlexGroup>
  );
}
